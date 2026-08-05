-- =============================================================================
-- nexo-social — Seed do banco
-- =============================================================================
-- A forma canônica (e sempre atualizada) de popular o banco é o endpoint
-- protegido POST /api/seed — acessível pelo botão "🌱 Popular banco" no painel
-- /admin. Ele insere TODO o dataset de lib/data.ts (24 conteúdos + 12 eventos +
-- curadoria Bom Dia) de forma idempotente (só insere em tabelas vazias).
--
-- Este arquivo oferece um seed mínimo em SQL puro, útil para validar o esquema
-- sem rodar a aplicação. Execute-o APÓS o schema.sql.
-- =============================================================================

-- Curadoria "Bom Dia" (a home lê sempre a mais recente)
INSERT INTO bom_dia (soundtrack_title, soundtrack_artist, recipe_title, recipe_description, quick_tip)
SELECT
  'Lofi Vibes & Ambient Focus', 'Curadoria Agendrap',
  'Toast de Abacate com Ovos Pochê',
  'Pão de fermentação natural, abacate amassado com azeite extra virgem, pimenta preta e ovos pochê (10 min).',
  'Dedique os primeiros 20 minutos do dia sem telas: leia, hidrate-se ou caminhe.'
WHERE NOT EXISTS (SELECT 1 FROM bom_dia);

-- Conteúdos (amostra representativa por tema)
INSERT INTO contents (title, category, subtopic, snippet, body, read_time, image_url)
SELECT * FROM (VALUES
  ('A revolução dos frameworks leves na web moderna', 'tecnologia', 'Desenvolvimento Web',
   'Novas arquiteturas buscam máxima performance e menor consumo de recursos.',
   'A pressão por Core Web Vitals e a explosão de dispositivos móveis empurraram o ecossistema para runtimes menores e renderização no edge.',
   '4 min', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'),
  ('Sintetizadores analógicos e o resgate da textura sonora', 'musica', 'Vinil & Analógico',
   'Produtores que preferem a calidez orgânica dos circuitos analógicos.',
   'A imperfeição dos osciladores analógicos virou assinatura estética no estúdio digital.',
   '6 min', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80'),
  ('Minimalismo e utilitarismo na moda urbana', 'moda', 'Streetwear',
   'Cortes limpos, tecidos tecnológicos e funcionalidade na cena urbana.',
   'O streetwear amadurece e abraça a durabilidade, unindo conforto e resistência.',
   '5 min', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80'),
  ('Arquitetura bioclimática nas grandes metrópoles', 'cultura', 'Arquitetura',
   'O design urbano se adapta às mudanças climáticas integrando vegetação.',
   'Fachadas verdes, ventilação passiva e materiais locais reduzem o consumo energético.',
   '5 min', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'),
  ('Ciência do treino: dados que transformam corredores amadores', 'esporte', 'Corrida',
   'Zonas de frequência e periodização deixam de ser exclusividade de elite.',
   'Wearables acessíveis democratizam o treino baseado em dados.',
   '6 min', 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80')
) AS v(title, category, subtopic, snippet, body, read_time, image_url)
WHERE NOT EXISTS (SELECT 1 FROM contents);

-- Eventos geolocalizados (amostra representativa por tema)
INSERT INTO events (title, category, event_date, city, location, lat, lng, image_url, description, price)
SELECT * FROM (VALUES
  ('Encontro de Desenvolvimento Web & IA', 'tecnologia', '15 de Agosto • 19:00', 'São Paulo', 'Hub de Inovação Paulista',
   -23.5613, -46.6565, 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
   'Painel com especialistas em engenharia de software, modelos de linguagem e o ecossistema web.', 'Gratuito'),
  ('Noite de Sintetizadores Analógicos', 'musica', '16 de Agosto • 21:00', 'Rio de Janeiro', 'Estúdio Lapa Sonora',
   -22.9133, -43.1794, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
   'Sets ao vivo com módulos eurorack e conversa aberta com produtores.', 'R$ 40'),
  ('Feira de Moda Circular & Upcycling', 'moda', '17 de Agosto • 12:00', 'São Paulo', 'Galpão Vila Madalena',
   -23.5546, -46.6899, 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80',
   'Marcas independentes, brechós selecionados e oficinas de reforma criativa.', 'Gratuito'),
  ('Mostra Cultural: Arte, Som & Design Digital', 'cultura', '22 de Agosto • 16:00', 'São Paulo', 'Galeria de Arte do Centro',
   -23.5479, -46.6388, 'https://images.unsplash.com/photo-1508997449629-303059a039c0?auto=format&fit=crop&w=800&q=80',
   'Exposição interativa com artistas gerativos e instalações audiovisuais.', 'Gratuito'),
  ('Corrida Noturna & Ciência do Treino', 'esporte', '18 de Agosto • 19:30', 'Florianópolis', 'Beira-Mar Norte',
   -27.5817, -48.5495, 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
   'Circuito de 5 km com aferição de dados e palestra sobre periodização.', 'R$ 25')
) AS v(title, category, event_date, city, location, lat, lng, image_url, description, price)
WHERE NOT EXISTS (SELECT 1 FROM events);
