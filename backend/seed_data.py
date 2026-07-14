"""Popula o VIBRAE OS com dados fictícios para demonstração."""
import uuid
from datetime import datetime, timezone, timedelta

def iso(dt=None):
    return (dt or datetime.now(timezone.utc)).isoformat()

async def run_seed(db, hash_password):
    if await db.users.count_documents({}) > 0:
        return  # já foi feito seed

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
