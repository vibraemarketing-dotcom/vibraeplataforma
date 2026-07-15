"""Popula o VIBRAE OS com dados fictícios para demonstração."""
import uuid
from datetime import datetime, timezone, timedelta

def iso(dt=None):
    return (dt or datetime.now(timezone.utc)).isoformat()

async def run_seed(db, hash_password):
    if await db.users.count_documents({}) > 0:
        # Só popula os dados de Fase 2 se ainda não existem
        await _seed_phase2_if_missing(db)
        return  # já foi feito seed base

    # ---------- Clientes fictícios ----------
    clientes = [
        {"trade_name": "Clínica Aurora Estética", "profession": "Biomédica Esteta", "specialty": "Estética facial",
         "city": "São Paulo/SP", "package": "Premium", "monthly_fee": 4800, "instagram": "@clinica.aurora",
         "phone": "5511987651234", "email": "contato@aurora.com.br", "status": "ativo"},
        {"trade_name": "Dr. Rafael Nunes — Ortopedia", "profession": "Médico", "specialty": "Ortopedia esportiva",
         "city": "Belo Horizonte/MG", "package": "Autoridade", "monthly_fee": 6200, "instagram": "@drrafaelnunes",
         "phone": "5531988112233", "email": "contato@drrafaelnunes.com.br", "status": "ativo"},
        {"trade_name": "Sorriso Vivo Odontologia", "profession": "Odontóloga", "specialty": "Harmonização orofacial",
         "city": "Curitiba/PR", "package": "Essencial", "monthly_fee": 3200, "instagram": "@sorrisovivo",
         "phone": "5541999887766", "email": "ola@sorrisovivo.com.br", "status": "onboarding"},
        {"trade_name": "Nutri Marina Prado", "profession": "Nutricionista", "specialty": "Emagrecimento saudável",
         "city": "Florianópolis/SC", "package": "Essencial", "monthly_fee": 2800, "instagram": "@nutrimarinaprado",
         "phone": "5548991234567", "email": "contato@marinaprado.com", "status": "ativo"},
        {"trade_name": "Vida Fisio Integrada", "profession": "Fisioterapeuta", "specialty": "RPG e Pilates clínico",
         "city": "Rio de Janeiro/RJ", "package": "Premium", "monthly_fee": 5400, "instagram": "@vidafisio",
         "phone": "5521985432167", "email": "atendimento@vidafisio.com.br", "status": "pausado"},
    ]

    client_ids = {}
    for c in clientes:
        cid = str(uuid.uuid4())
        c.update({
            "id": cid, "legal_name": c["trade_name"] + " LTDA", "document": "12.345.678/0001-90",
            "responsible": "Ana Ribeiro", "onboarding_progress": 100 if c["status"] == "ativo" else 45,
            "created_at": iso(), "updated_at": iso(),
        })
        await db.clients.insert_one(c)
        client_ids[c["trade_name"]] = cid

    # ---------- Usuários ----------
    users = [
        {"email": "admin@vibrae.com", "password": "vibrae2026", "name": "Ana Ribeiro", "role": "superadmin"},
        {"email": "comercial@vibrae.com", "password": "vibrae2026", "name": "Lucas Ferraz", "role": "comercial"},
        {"email": "estrategia@vibrae.com", "password": "vibrae2026", "name": "Marina Costa", "role": "estrategista"},
        {"email": "social@vibrae.com", "password": "vibrae2026", "name": "Bianca Alves", "role": "social_media"},
        {"email": "financeiro@vibrae.com", "password": "vibrae2026", "name": "Rafael Duarte", "role": "financeiro"},
        {"email": "cliente@aurora.com", "password": "vibrae2026", "name": "Dra. Camila Torres", "role": "client_admin",
         "client_id": client_ids["Clínica Aurora Estética"]},
        {"email": "cliente@drrafael.com", "password": "vibrae2026", "name": "Dr. Rafael Nunes", "role": "client_admin",
         "client_id": client_ids["Dr. Rafael Nunes — Ortopedia"]},
    ]
    for u in users:
        pw = u.pop("password")
        u.update({"id": str(uuid.uuid4()), "password_hash": hash_password(pw), "created_at": iso()})
        await db.users.insert_one(u)

    # ---------- Leads ----------
    leads = [
        {"name": "Dra. Fernanda Lima", "company": "Clínica Bem Estar", "phone": "5511998877665",
         "email": "fernanda@bemestar.com", "instagram": "@drafernandalima", "profession": "Dermatologista",
         "specialty": "Cosmiatria", "city": "São Paulo/SP", "source": "Indicação", "service": "Gestão de redes sociais",
         "budget": 4500, "potential_value": 5200, "stage": "qualificado", "responsible": "Lucas Ferraz",
         "probability": 60, "notes": "Já teve agência anterior. Busca mais autoridade."},
        {"name": "Dr. Henrique Sá", "company": "Sá Ortopedia", "phone": "5531977665544",
         "email": "henrique@saortopedia.com", "instagram": "@drhenriquesa", "profession": "Ortopedista",
         "specialty": "Joelho", "city": "Belo Horizonte/MG", "source": "Instagram Ads", "service": "Autoridade médica",
         "budget": 6000, "potential_value": 6500, "stage": "reuniao_marcada", "responsible": "Lucas Ferraz",
         "probability": 70, "notes": "Reunião marcada terça 15h."},
        {"name": "Ana Paula Vidal", "company": "Estúdio Vidal", "phone": "5541988776655",
         "email": "ana@estudiovidal.com", "instagram": "@estudiovidal", "profession": "Esteticista",
         "specialty": "Micropigmentação", "city": "Curitiba/PR", "source": "Google", "service": "Design + Reels",
         "budget": 2500, "potential_value": 2900, "stage": "proposta_enviada", "responsible": "Lucas Ferraz",
         "probability": 55, "notes": "Aguardando retorno após envio."},
        {"name": "Dr. Marco Aurélio", "company": "Clínica Vitalis", "phone": "5548999112233",
         "email": "marco@vitalis.com", "instagram": "@clinicavitalis", "profession": "Cardiologista",
         "specialty": "Cardiologia preventiva", "city": "Florianópolis/SC", "source": "Indicação",
         "service": "Consultoria estratégica", "budget": 8000, "potential_value": 9000, "stage": "negociacao",
         "responsible": "Lucas Ferraz", "probability": 80, "notes": "Ajuste no escopo."},
        {"name": "Bruna Coelho", "company": "Espaço Zen", "phone": "5521987654321",
         "email": "bruna@espacozen.com", "instagram": "@espacozen", "profession": "Terapeuta",
         "specialty": "Bem-estar", "city": "Niterói/RJ", "source": "Site", "service": "Reels + Stories",
         "budget": 2000, "potential_value": 2400, "stage": "novo_lead", "responsible": "Lucas Ferraz",
         "probability": 20, "notes": "Primeiro contato feito por WhatsApp."},
        {"name": "Dr. Igor Menezes", "company": "Menezes Estética", "phone": "5511911223344",
         "email": "igor@menezes.com", "instagram": "@drmenezes", "profession": "Dentista",
         "specialty": "HOF", "city": "Campinas/SP", "source": "Indicação", "service": "Gestão completa",
         "budget": 5500, "potential_value": 6000, "stage": "primeiro_contato", "responsible": "Lucas Ferraz",
         "probability": 35, "notes": "Retornar semana que vem."},
        {"name": "Dra. Larissa Prado", "company": "Instituto Prado", "phone": "5511922334455",
         "email": "larissa@prado.com", "instagram": "@drapradoo", "profession": "Nutricionista",
         "specialty": "Esportiva", "city": "São Paulo/SP", "source": "Instagram", "service": "Reels + Consultoria",
         "budget": 3500, "potential_value": 3800, "stage": "follow_up", "responsible": "Lucas Ferraz",
         "probability": 45, "notes": "Aguarda material para diagnóstico."},
    ]
    for l in leads:
        l.update({"id": str(uuid.uuid4()), "created_at": iso(), "updated_at": iso()})
        await db.leads.insert_one(l)

    # ---------- Conteúdos ----------
    aurora = client_ids["Clínica Aurora Estética"]
    rafael = client_ids["Dr. Rafael Nunes — Ortopedia"]
    marina = client_ids["Nutri Marina Prado"]

    conteudos = [
        {"client_id": aurora, "title": "Reels: 3 sinais de que sua pele precisa de cuidado profissional",
         "format": "reels", "status": "aguardando_aprovacao", "caption": "Sua pele merece cuidado especializado. Agende sua avaliação.",
         "cta": "Agende sua avaliação", "hashtags": "#skincare #estetica #aurora", "thumbnail_url": "",
         "objective": "Educar", "pillar": "Autoridade", "priority": "alta", "responsible": "Bianca Alves"},
        {"client_id": aurora, "title": "Carrossel: Peeling profissional x caseiro",
         "format": "carrossel", "status": "aprovado", "caption": "Descubra por que o peeling profissional é insubstituível.",
         "cta": "Saiba mais", "hashtags": "#peeling #dermato", "thumbnail_url": "",
         "objective": "Educar", "pillar": "Autoridade", "priority": "media", "responsible": "Bianca Alves"},
        {"client_id": aurora, "title": "Story sequência: Bastidores do laser CO2",
         "format": "story", "status": "em_producao", "caption": "", "cta": "",
         "objective": "Prova social", "pillar": "Bastidores", "priority": "media", "responsible": "Bianca Alves"},
        {"client_id": aurora, "title": "Post: Regras do CFM em publicidade médica",
         "format": "post", "status": "revisao_compliance", "caption": "Publicidade responsável é sinônimo de credibilidade.",
         "cta": "", "objective": "Autoridade", "pillar": "Compliance", "priority": "baixa", "responsible": "Marina Costa"},
        {"client_id": rafael, "title": "Reels: Lesão de joelho no corredor amador",
         "format": "reels", "status": "aguardando_aprovacao", "caption": "Correr sem preparo pode custar caro.",
         "cta": "Agende sua consulta", "hashtags": "#ortopedia #corrida", "thumbnail_url": "",
         "objective": "Captação", "pillar": "Autoridade", "priority": "alta", "responsible": "Bianca Alves"},
        {"client_id": rafael, "title": "Carrossel: 5 mitos sobre cirurgia do joelho",
         "format": "carrossel", "status": "ajuste_solicitado", "caption": "Vamos derrubar mitos comuns.",
         "cta": "Saiba mais", "objective": "Educar", "pillar": "Autoridade", "priority": "alta", "responsible": "Bianca Alves"},
        {"client_id": rafael, "title": "Post: Depoimento paciente (autorizado)",
         "format": "post", "status": "publicado", "caption": "Histórias reais que transformam.",
         "cta": "", "objective": "Prova social", "pillar": "Prova social", "priority": "media", "responsible": "Bianca Alves"},
        {"client_id": marina, "title": "Reels: 3 lanches que sabotam sua dieta",
         "format": "reels", "status": "ideia", "caption": "", "cta": "",
         "objective": "Educar", "pillar": "Educação", "priority": "media", "responsible": "Bianca Alves"},
        {"client_id": marina, "title": "Carrossel: Cardápio real de uma semana",
         "format": "carrossel", "status": "aprovado", "caption": "Seu cardápio, seu estilo de vida.",
         "cta": "Agende sua consulta", "objective": "Captação", "pillar": "Educação", "priority": "media", "responsible": "Bianca Alves"},
    ]
    for i, c in enumerate(conteudos):
        c.update({
            "id": str(uuid.uuid4()),
            "platform": "Instagram",
            "scheduled_at": iso(datetime.now(timezone.utc) + timedelta(days=i)),
            "version": 1 if c["status"] != "ajuste_solicitado" else 2,
            "hook": "",
            "created_at": iso(),
            "updated_at": iso(),
            "history": [
                {"version": 1, "action": "created", "user": "Bianca Alves", "timestamp": iso(), "comment": "Criado a partir do calendário editorial"}
            ]
        })
        if c["status"] == "ajuste_solicitado":
            c["history"].append({"version": 2, "action": "adjustment", "user": "Dr. Rafael Nunes",
                                 "timestamp": iso(), "comment": "Trocar imagem de capa e revisar CTA final."})
        await db.content.insert_one(c)

    # atividades iniciais
    activities = [
        "Ana Ribeiro criou o cliente Clínica Aurora Estética",
        "Lucas Ferraz cadastrou lead Dra. Fernanda Lima",
        "Bianca Alves enviou 2 conteúdos para aprovação",
        "Dr. Rafael Nunes solicitou ajuste em Carrossel: 5 mitos",
        "Sorriso Vivo Odontologia iniciou onboarding",
    ]
    for a in activities:
        await db.activities.insert_one({
            "id": str(uuid.uuid4()), "text": a, "kind": "system",
            "user_name": "Sistema", "created_at": iso()
        })

    # Também popula fase 2 no primeiro seed
    await _seed_phase2_if_missing(db)


async def _seed_phase2_if_missing(db):
    """Popula Brand Kits + Financeiro se ainda não existirem."""
    from datetime import timedelta
    await _seed_phase3_if_missing(db)

    # Brand Kits
    if await db.brand_kits.count_documents({}) == 0:
        clients = await db.clients.find({}, {"_id": 0}).to_list(50)
        by_name = {c["trade_name"]: c for c in clients}

        brand_kits = [
            {
                "trade_name": "Clínica Aurora Estética",
                "council": "estetica",
                "council_number": "CRBM-SP 12345",
                "tone_of_voice": "Elegante, acolhedor, técnico sem ser frio",
                "audience": "Mulheres 30-55 anos, classe A/B, buscam estética preventiva",
                "persona": "Camila, 42 anos, executiva, cuida da pele com investimento consciente",
                "pillars": ["Autoridade técnica", "Bastidores", "Educação estética", "Prova social"],
                "allowed_words": ["cuidado", "avaliação", "protocolo", "resultado individualizado"],
                "forbidden_words": ["milagre", "garantido", "melhor do Brasil", "rejuvenescedor mágico"],
                "ctas": ["Agende sua avaliação", "Conheça nosso protocolo", "Fale com nosso time"],
                "hashtags": "#skincare #estetica #biomedicina #cuidadofacial",
                "color_primary": "#B79A6A", "color_secondary": "#231F20",
                "archetype": "Cuidadora",
            },
            {
                "trade_name": "Dr. Rafael Nunes — Ortopedia",
                "council": "cfm", "council_number": "CRM-MG 45678 · RQE 12345",
                "tone_of_voice": "Direto, científico, tranquilizador",
                "audience": "Homens e mulheres 25-60 anos, ativos, com dores articulares ou lesões",
                "persona": "Corredor amador com dor no joelho — quer voltar a treinar sem cirurgia desnecessária",
                "pillars": ["Autoridade médica", "Educação", "Prevenção", "Casos anonimizados"],
                "allowed_words": ["avaliação", "diagnóstico", "tratamento individualizado", "evidência científica"],
                "forbidden_words": ["cura garantida", "sem dor imediata", "resultado 100%"],
                "ctas": ["Agende sua consulta", "Conheça o tratamento"],
                "hashtags": "#ortopedia #corrida #joelho #medicinaesportiva",
                "color_primary": "#1F3B5B", "color_secondary": "#F5F5F5",
                "archetype": "Sábio",
            },
            {
                "trade_name": "Sorriso Vivo Odontologia",
                "council": "cro", "council_number": "CRO-PR 98765",
                "tone_of_voice": "Suave, humano, moderno",
                "audience": "Mulheres 25-50 anos que investem em autoestima",
                "persona": "Marina, 34, quer harmonização facial discreta e natural",
                "pillars": ["Educação em HOF", "Bastidores da clínica", "Depoimentos autorizados", "Ciência estética"],
                "allowed_words": ["harmonização", "naturalidade", "avaliação personalizada"],
                "forbidden_words": ["antes e depois sem autorização", "preço", "promoção"],
                "ctas": ["Agende sua avaliação", "Conheça a clínica"],
                "hashtags": "#odontologia #hof #harmonizacaofacial",
                "color_primary": "#C7A876", "color_secondary": "#231F20",
                "archetype": "Amante da beleza",
            },
            {
                "trade_name": "Nutri Marina Prado",
                "council": "crn", "council_number": "CRN-8 54321",
                "tone_of_voice": "Leve, motivador, educativo",
                "audience": "Mulheres 25-45 anos, buscam emagrecimento saudável e sustentável",
                "persona": "Beatriz, 32, mãe, cansada de dietas restritivas",
                "pillars": ["Nutrição funcional", "Receitas", "Educação alimentar", "Mitos e verdades"],
                "allowed_words": ["equilíbrio", "sustentável", "individualizado", "estilo de vida"],
                "forbidden_words": ["dieta milagrosa", "emagreça em 7 dias", "detox miraculoso"],
                "ctas": ["Agende sua consulta", "Comece hoje"],
                "hashtags": "#nutricao #emagrecimentosaudavel",
                "color_primary": "#7A8C5B", "color_secondary": "#231F20",
                "archetype": "Guia",
            },
        ]
        for bk in brand_kits:
            client = by_name.get(bk["trade_name"])
            if not client: continue
            bk["client_id"] = client["id"]
            bk["updated_at"] = iso()
            await db.brand_kits.insert_one(bk)

    # Financeiro
    if await db.financial_transactions.count_documents({}) == 0:
        clients = await db.clients.find({"status": {"$in": ["ativo", "onboarding"]}}, {"_id": 0}).to_list(50)
        today = datetime.now(timezone.utc)
        # Receitas: 3 meses de histórico de mensalidades + próximas
        for c in clients:
            for offset in [-2, -1, 0, 1]:
                due = (today.replace(day=10) + timedelta(days=offset * 30))
                tx = {
                    "id": str(uuid.uuid4()),
                    "client_id": c["id"],
                    "type": "receita",
                    "category": "Mensalidade",
                    "description": f"Mensalidade — {c['trade_name']}",
                    "amount": c.get("monthly_fee", 0),
                    "due_date": due.date().isoformat(),
                    "payment_method": "PIX",
                    "recurring": True,
                    "notes": "",
                    "created_at": iso(),
                    "updated_at": iso(),
                }
                if offset < 0:  # pagas
                    tx["status"] = "pago"
                    tx["paid_at"] = (due + timedelta(days=2)).isoformat()
                elif offset == 0:  # este mês pendente (ou vencida se dia 10 já passou)
                    tx["status"] = "pendente" if today.day <= 10 else "vencido"
                    tx["paid_at"] = None
                else:  # futuras
                    tx["status"] = "previsto"
                    tx["paid_at"] = None
                await db.financial_transactions.insert_one(tx)

        # Uma inadimplência clara
        overdue_client = clients[0] if clients else None
        if overdue_client:
            await db.financial_transactions.insert_one({
                "id": str(uuid.uuid4()),
                "client_id": overdue_client["id"],
                "type": "receita",
                "category": "Serviço avulso",
                "description": "Cobertura de evento — cliente inadimplente",
                "amount": 1800,
                "due_date": (today - timedelta(days=15)).date().isoformat(),
                "status": "vencido", "payment_method": "Boleto",
                "recurring": False, "notes": "Aguarda regularização",
                "created_at": iso(), "updated_at": iso(), "paid_at": None,
            })

        # Despesas fixas do mês
        despesas = [
            ("Equipe interna — salários", 18500, "Equipe"),
            ("Freelancer videomaker", 3200, "Freelancers"),
            ("Meta Ads (verba da agência)", 1500, "Anúncios"),
            ("Assinatura de ferramentas (design/edição)", 890, "Ferramentas"),
            ("Contabilidade e impostos", 2400, "Impostos"),
        ]
        for desc, amount, cat in despesas:
            due = today.replace(day=5)
            await db.financial_transactions.insert_one({
                "id": str(uuid.uuid4()),
                "client_id": None,
                "type": "despesa", "category": cat, "description": desc,
                "amount": amount, "due_date": due.date().isoformat(),
                "status": "pago", "payment_method": "Débito automático",
                "recurring": True, "notes": "",
                "created_at": iso(), "updated_at": iso(),
                "paid_at": (due + timedelta(days=1)).isoformat(),
            })

        # Despesas variáveis: mês anterior também
        for offset in [-2, -1]:
            for desc, amount, cat in despesas[:3]:
                due = today.replace(day=5) + timedelta(days=offset * 30)
                await db.financial_transactions.insert_one({
                    "id": str(uuid.uuid4()),
                    "client_id": None,
                    "type": "despesa", "category": cat, "description": desc,
                    "amount": amount, "due_date": due.date().isoformat(),
                    "status": "pago", "payment_method": "Débito automático",
                    "recurring": True, "notes": "",
                    "created_at": iso(), "updated_at": iso(),
                    "paid_at": (due + timedelta(days=1)).isoformat(),
                })


async def _seed_phase3_if_missing(db):
    """Popula Stories, Métricas/Relatórios e Tarefas para demo."""
    from datetime import timedelta

    clients = await db.clients.find({}, {"_id": 0}).to_list(50)
    by_name = {c["trade_name"]: c for c in clients}
    aurora = by_name.get("Clínica Aurora Estética")
    rafael = by_name.get("Dr. Rafael Nunes — Ortopedia")

    # Stories em Sequência
    if await db.story_sequences.count_documents({}) == 0 and aurora:
        seq = {
            "id": str(uuid.uuid4()),
            "client_id": aurora["id"],
            "title": "Bastidores: Protocolo Aurora Renew",
            "objective": "Mostrar autoridade técnica e humanizar o atendimento",
            "status": "aguardando_aprovacao",
            "version": 1,
            "scheduled_at": iso(datetime.now(timezone.utc) + timedelta(days=2)),
            "created_at": iso(), "updated_at": iso(),
            "frames": [
                {"index": 0, "text": "Você conhece o Protocolo Aurora Renew?", "cta": "Toque para saber", "link": "",
                 "background": "#231F20", "text_color": "#F7F5F2", "media_url": "",
                 "interaction": "none", "poll_question": "", "poll_options": []},
                {"index": 1, "text": "3 etapas · avaliação, protocolo individualizado, acompanhamento", "cta": "",
                 "background": "#A18133", "text_color": "#F7F5F2", "media_url": "",
                 "interaction": "none", "poll_question": "", "poll_options": []},
                {"index": 2, "text": "Cada pele responde de um jeito.", "cta": "",
                 "background": "#EFECE7", "text_color": "#231F20", "media_url": "",
                 "interaction": "poll", "poll_question": "Já fez avaliação com biomédica?",
                 "poll_options": ["Sim", "Ainda não"]},
                {"index": 3, "text": "Agende sua avaliação e comece pelo caminho certo.",
                 "cta": "Agendar avaliação", "link": "https://wa.me/5511987651234",
                 "background": "#231F20", "text_color": "#A18133", "media_url": "",
                 "interaction": "link", "poll_question": "", "poll_options": []},
            ],
            "history": [{"version": 1, "action": "sent_to_approval", "user": "Bianca Alves", "timestamp": iso()}],
        }
        await db.story_sequences.insert_one(seq)

    # Métricas dos últimos 3 meses (Aurora e Rafael)
    if await db.metrics.count_documents({}) == 0:
        today = datetime.now(timezone.utc)
        base_data = [
            (aurora, [
                {"followers": 8420, "followers_delta": 180, "reach": 42500, "impressions": 68000,
                 "engagement": 4.8, "profile_visits": 3200, "website_clicks": 148,
                 "saves": 220, "shares": 95, "comments": 340, "stories_reach": 6800, "reels_views": 28000},
                {"followers": 8600, "followers_delta": 220, "reach": 48200, "impressions": 74000,
                 "engagement": 5.1, "profile_visits": 3480, "website_clicks": 172,
                 "saves": 258, "shares": 112, "comments": 388, "stories_reach": 7100, "reels_views": 32000},
                {"followers": 8820, "followers_delta": 260, "reach": 55600, "impressions": 82000,
                 "engagement": 5.6, "profile_visits": 3820, "website_clicks": 205,
                 "saves": 312, "shares": 140, "comments": 442, "stories_reach": 7900, "reels_views": 38400},
            ]),
            (rafael, [
                {"followers": 12100, "followers_delta": 340, "reach": 68000, "impressions": 96000,
                 "engagement": 6.2, "profile_visits": 5100, "website_clicks": 380,
                 "saves": 480, "shares": 210, "comments": 620, "stories_reach": 9400, "reels_views": 52000},
                {"followers": 12440, "followers_delta": 420, "reach": 74800, "impressions": 108000,
                 "engagement": 6.8, "profile_visits": 5480, "website_clicks": 442,
                 "saves": 540, "shares": 258, "comments": 704, "stories_reach": 10100, "reels_views": 61000},
                {"followers": 12860, "followers_delta": 460, "reach": 82400, "impressions": 118000,
                 "engagement": 7.2, "profile_visits": 6020, "website_clicks": 512,
                 "saves": 616, "shares": 294, "comments": 802, "stories_reach": 11400, "reels_views": 68200},
            ]),
        ]
        for client, months in base_data:
            if not client: continue
            for i, m in enumerate(months):
                # 3 meses atrás, 2 meses atrás, 1 mês atrás
                target = today - timedelta(days=(3 - i) * 30)
                doc = {"id": str(uuid.uuid4()), "client_id": client["id"],
                       "month": target.month, "year": target.year,
                       "source": "manual", "created_at": iso(), "updated_at": iso(), **m}
                await db.metrics.insert_one(doc)

    # Relatório mensal do mês passado
    if await db.reports.count_documents({}) == 0 and aurora:
        last_month = datetime.now(timezone.utc) - timedelta(days=30)
        # top contents (aprovados/publicados do Aurora)
        aurora_contents = await db.content.find(
            {"client_id": aurora["id"], "status": {"$in": ["aprovado", "publicado"]}}, {"_id": 0}
        ).to_list(5)
        report = {
            "id": str(uuid.uuid4()),
            "client_id": aurora["id"],
            "month": last_month.month, "year": last_month.year,
            "summary": "Mês de consolidação da autoridade técnica com foco em conteúdo educativo. Aumento consistente de alcance e engajamento após revisão da estratégia editorial.",
            "highlights": [
                "Aumento de 5,6% na taxa de engajamento — melhor do trimestre",
                "Carrossel 'Peeling profissional x caseiro' virou referência",
                "Salvamentos cresceram 21% mês a mês",
                "260 novos seguidores qualificados",
            ],
            "learnings": [
                "Conteúdos que respondem dúvidas comuns geram mais salvamentos",
                "Reels curtos (<20s) mantêm 3x mais retenção",
            ],
            "risks": [
                "Sazonalidade de fim de ano pode reduzir agendamentos em dezembro",
            ],
            "next_steps": [
                "Campanha temática de 'Preparação de pele para o verão'",
                "Ativar sequência de Stories de bastidores 2x por semana",
                "Testar Reels com formato de mito x verdade",
            ],
            "top_content_ids": [c["id"] for c in aurora_contents[:3]],
            "agency_notes": "Cliente respondeu bem ao redirecionamento estratégico. Recomenda-se manter cadência atual.",
            "status": "publicado",
            "created_at": iso(), "updated_at": iso(),
        }
        await db.reports.insert_one(report)

    # Tarefas com Gantt
    if await db.tasks.count_documents({}) == 0:
        today = datetime.now(timezone.utc)
        tasks_data = [
            ("Captação mensal — Aurora Estética", "captacao", aurora, today, 1, "Bianca Alves", "em_andamento", "alta"),
            ("Edição dos vídeos captados — Aurora", "producao", aurora, today + timedelta(days=2), 4, "João Editor", "pendente", "alta"),
            ("Planejamento editorial — Aurora Nov", "geral", aurora, today - timedelta(days=1), 2, "Marina Costa", "em_andamento", "media"),
            ("Campanha 'Verão sem preocupação' — Aurora", "campanha", aurora, today + timedelta(days=5), 20, "Marina Costa", "pendente", "alta"),
            ("Captação — Dr. Rafael Nunes", "captacao", rafael, today + timedelta(days=1), 1, "Bianca Alves", "pendente", "media"),
            ("Roteiro de série 'Mitos ortopédicos'", "producao", rafael, today + timedelta(days=3), 5, "Marina Costa", "pendente", "media"),
            ("Edição série mitos — Dr. Rafael", "producao", rafael, today + timedelta(days=8), 4, "João Editor", "pendente", "media"),
            ("Reunião estratégica trimestral — Dr. Rafael", "geral", rafael, today + timedelta(days=10), 0, "Ana Ribeiro", "pendente", "alta"),
            ("Relatório mensal — Aurora", "geral", aurora, today + timedelta(days=3), 1, "Marina Costa", "pendente", "media"),
            ("Relatório mensal — Dr. Rafael", "geral", rafael, today + timedelta(days=3), 1, "Marina Costa", "pendente", "media"),
        ]
        for title, kind, client, start, dur, assignee, status, prio in tasks_data:
            if not client: continue
            await db.tasks.insert_one({
                "id": str(uuid.uuid4()),
                "client_id": client["id"],
                "title": title, "kind": kind,
                "start_date": start.date().isoformat(),
                "end_date": (start + timedelta(days=dur)).date().isoformat(),
                "assignee": assignee, "status": status, "priority": prio,
                "description": "", "depends_on": None,
                "created_at": iso(), "updated_at": iso(),
            })
