"""Idempotent setup do catálogo Stripe para o VIBRAE OS Multi-Agência."""
import os
import stripe
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

CATALOG = [
    {
        "emergent_product_id": "vibrae_starter",
        "name": "VIBRAE Starter",
        "description": "Plano inicial para agências até 5 clientes ativos.",
        "tax_code": "txcd_10103001",
        "prices": [
            {"lookup_key": "vibrae_starter_monthly", "amount": 29700, "currency": "brl", "interval": "month"},
        ],
    },
    {
        "emergent_product_id": "vibrae_pro",
        "name": "VIBRAE Pro",
        "description": "Plano completo para agências em crescimento, até 25 clientes ativos.",
        "tax_code": "txcd_10103001",
        "prices": [
            {"lookup_key": "vibrae_pro_monthly", "amount": 79700, "currency": "brl", "interval": "month"},
        ],
    },
    {
        "emergent_product_id": "vibrae_studio",
        "name": "VIBRAE Studio",
        "description": "Plano ilimitado para grandes agências, com white-label completo.",
        "tax_code": "txcd_10103001",
        "prices": [
            {"lookup_key": "vibrae_studio_monthly", "amount": 199700, "currency": "brl", "interval": "month"},
        ],
    },
]

def get_or_create_product(entry):
    for p in stripe.Product.list(active=True, limit=100).auto_paging_iter():
        if p.to_dict().get("metadata", {}).get("emergent_product_id") == entry["emergent_product_id"]:
            return p
    return stripe.Product.create(
        name=entry["name"],
        description=entry.get("description", ""),
        tax_code=entry.get("tax_code"),
        metadata={"managed_by": "emergent", "emergent_product_id": entry["emergent_product_id"]},
    )

def main():
    for entry in CATALOG:
        product = get_or_create_product(entry)
        print(f"Product: {product.name} ({product.id})")
        for p in entry["prices"]:
            existing = stripe.Price.list(lookup_keys=[p["lookup_key"]], active=True, limit=1).data
            if existing and (existing[0].unit_amount != p["amount"] or existing[0].currency != p["currency"]):
                stripe.Price.modify(existing[0].id, active=False)
                existing = []
            if not existing:
                kwargs = dict(product=product.id, unit_amount=p["amount"], currency=p["currency"],
                              lookup_key=p["lookup_key"], transfer_lookup_key=True,
                              recurring={"interval": p["interval"]})
                stripe.Price.create(**kwargs)
                print(f"  + Price {p['lookup_key']} @ {p['amount']} {p['currency']}")
            else:
                print(f"  = Price {p['lookup_key']} ok")

if __name__ == "__main__":
    main()
