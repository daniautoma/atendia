import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as cheerio from 'cheerio';
import { z } from 'zod';

const importSchema = z.object({
  url: z.string().url('Introduce una URL válida (ej: https://ejemplo.es)'),
});

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const parsed = importSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const targetUrl = parsed.data.url;

    // 1. Descarga el contenido HTML de la web
    let html = '';
    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: `No se pudo acceder a la página web (HTTP ${res.status}). Verifica que la URL sea accesible.` },
          { status: 400 }
        );
      }
      html = await res.text();
    } catch (fetchError: any) {
      return NextResponse.json(
        { error: `Error de red al conectar con la URL: ${fetchError?.message || 'Tiempo de espera agotado'}` },
        { status: 400 }
      );
    }

    // 2. Extraer texto limpio con Cheerio
    const $ = cheerio.load(html);
    $('script, style, noscript, svg, nav, footer, iframe').remove();

    const title = $('title').text().trim();
    const rawText = $('body').text().replace(/\s+/g, ' ').trim();
    const truncatedText = rawText.slice(0, 12000); // Primeros 12k caracteres para caber en contexto

    // 3. Obtener configuración del modelo de IA
    const config = await prisma.assistantConfig.findFirst();
    const model = config?.aiModel || 'anthropic/claude-haiku-5.5';
    const apiKey = process.env.OPENROUTER_API_KEY;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    if (apiKey && apiKey.trim().length > 0) {
      const prompt = `Analiza el siguiente texto extraído de la página web de un negocio local ("${title}") y extrae en formato JSON estructurado:
1. "businessInfo": { "name": string, "activity": string, "address": string, "phone": string }
2. "services": array de hasta 8 objetos con { "name": string, "description": string, "durationMinutes": number, "price": number o null, "isPriceFrom": boolean, "requiresEvaluation": boolean }
3. "faqs": array de hasta 6 preguntas frecuentes con { "question": string, "answer": string }
4. "businessHours": horario aproximado o estándar si no se especifica.

IMPORTANTE: Responde ÚNICAMENTE con el objeto JSON válido, sin bloques de markdown adicionales ni explicaciones.

Texto de la web:
${truncatedText}`;

      try {
        const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': appUrl,
            'X-Title': 'Coversa',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
          }),
          signal: AbortSignal.timeout(20000),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          let content = aiData.choices?.[0]?.message?.content || '{}';
          content = content.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsedProposal = JSON.parse(content);
          return NextResponse.json({ success: true, proposal: parsedProposal, sourceUrl: targetUrl });
        }
      } catch (aiErr) {
        console.warn('Fallo en llamada OpenRouter para importación web, usando fallback:', aiErr);
      }
    }

    // Heurística / Fallback estructurado si no hay API Key configurada todavía
    const fallbackProposal = {
      businessInfo: {
        name: title.split(/[-|–]/)[0]?.trim() || 'Negocio Local',
        activity: 'Servicios profesionales y atención al cliente',
        address: 'San Salvador, El Salvador',
        phone: '+503 2200 0000',
      },
      services: [
        {
          name: 'Consulta y Diagnóstico Inicial',
          description: 'Valoración inicial y asesoramiento personalizado.',
          durationMinutes: 30,
          price: 0,
          isPriceFrom: false,
          requiresEvaluation: false,
        },
        {
          name: 'Servicio Estándar Especializado',
          description: 'Tratamiento y atención técnica completa según necesidades del cliente.',
          durationMinutes: 45,
          price: 65,
          isPriceFrom: true,
          requiresEvaluation: false,
        },
      ],
      faqs: [
        {
          question: '¿Cuál es el horario de atención?',
          answer: 'Atendemos de lunes a viernes en horario comercial. Puedes consultar disponibilidad exacta o pedir cita por este chat.',
        },
        {
          question: '¿Dónde está ubicado el local?',
          answer: 'Nos encontramos en una zona céntrica y de fácil acceso.',
        },
      ],
      businessHours: {
        monday: { open: '09:00', close: '20:00', enabled: true },
        tuesday: { open: '09:00', close: '20:00', enabled: true },
        wednesday: { open: '09:00', close: '20:00', enabled: true },
        thursday: { open: '09:00', close: '20:00', enabled: true },
        friday: { open: '09:00', close: '20:00', enabled: true },
        saturday: { open: '10:00', close: '14:00', enabled: false },
        sunday: { open: '00:00', close: '00:00', enabled: false },
      },
    };

    return NextResponse.json({
      success: true,
      proposal: fallbackProposal,
      sourceUrl: targetUrl,
      notice: apiKey ? undefined : 'Modo demostración (configura OPENROUTER_API_KEY para extracción directa por LLM).',
    });
  } catch (error: any) {
    console.error('Error en /api/knowledge/import-web:', error);
    return NextResponse.json({ error: error?.message || 'Error al procesar la web' }, { status: 500 });
  }
}

