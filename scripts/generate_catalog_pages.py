from __future__ import annotations

import csv
import html
import unicodedata
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = REPO_ROOT / "catalogue" / "import_items.csv"
OUTPUT_DIR = REPO_ROOT / "catalogue" / "pages"


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    allowed = [ch.lower() if ch.isalnum() else "-" for ch in ascii_text]
    slug = "".join(allowed)
    while "--" in slug:
        slug = slug.replace("--", "-")
    slug = slug.strip("-")
    return slug or "produit"


def render_product_page(data: dict[str, str]) -> str:
    product_id = data.get("ID Produit Sellsy", "").strip()
    name = data.get("Nom commercial", "Produit sans nom").strip() or "Produit sans nom"
    reference = data.get("Référence", "").strip()
    category = data.get("Catégorie", "").strip()
    unit = data.get("Unité", "").strip()
    description = data.get("Description", "").strip()
    link = data.get("lien", "").strip()
    image = data.get("image", "").strip()

    tariff_fields = [
        "Tarif -20%",
        "Tarif -35%",
        "Tarif -40%",
        "Tarif 10%",
        "Tarif plein",
        "Prix référence HT",
    ]

    tariffs = [(field, data.get(field, "").strip()) for field in tariff_fields if data.get(field)]

    parts: list[str] = [
        "<!DOCTYPE html>",
        '<html lang="fr">',
        "  <head>",
        "    <meta charset=\"utf-8\" />",
        f"    <title>{html.escape(name)} – Fiche produit</title>",
        "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
        "    <link rel=\"stylesheet\" href=\"../styles/catalog-page.css\" />",
        "  </head>",
        "  <body>",
        "    <header>",
        "      <nav class=\"breadcrumbs\">",
        "        <a href=\"index.html\">← Retour à l'index des fiches</a>",
        "      </nav>",
        f"      <h1>{html.escape(name)}</h1>",
    ]

    if reference:
        parts.append(f"      <p class=\"meta\"><strong>Référence :</strong> {html.escape(reference)}</p>")
    if product_id:
        parts.append(f"      <p class=\"meta\"><strong>ID :</strong> {html.escape(product_id)}</p>")
    if category or unit:
        details: list[str] = []
        if category:
            details.append(f"Catégorie : {html.escape(category)}")
        if unit:
            details.append(f"Unité : {html.escape(unit)}")
        parts.append(f"      <p class=\"meta\">{' · '.join(details)}</p>")

    parts.extend(
        [
            "    </header>",
            "    <main>",
        ]
    )

    if description:
        parts.append(f"      <section><h2>Description</h2><p>{html.escape(description)}</p></section>")

    if tariffs:
        parts.append("      <section>")
        parts.append("        <h2>Tarifs</h2>")
        parts.append("        <ul class=\"tariff-list\">")
        for field, value in tariffs:
            parts.append(f"          <li><span>{html.escape(field)}</span><span>{html.escape(value)}</span></li>")
        parts.append("        </ul>")
        parts.append("      </section>")

    if link:
        safe_link = html.escape(link)
        parts.append(
            "      <section>"
            f"        <h2>Lien</h2><p><a href=\"{safe_link}\" target=\"_blank\" rel=\"noopener noreferrer\">{safe_link}</a></p>"
            "      </section>"
        )

    if image:
        safe_image = html.escape(image)
        parts.append("      <section class=\"product-image\">")
        parts.append(f"        <h2>Image</h2><img src=\"{safe_image}\" alt=\"{html.escape(name)}\" />")
        parts.append("      </section>")

    parts.extend(
        [
            "    </main>",
            "    <footer>",
            "      <p>© Deviseur – Catalogue produits</p>",
            "    </footer>",
            "  </body>",
            "</html>",
        ]
    )

    return "\n".join(parts) + "\n"


def render_index_page(products: list[dict[str, str]]) -> str:
    parts: list[str] = [
        "<!DOCTYPE html>",
        '<html lang="fr">',
        "  <head>",
        "    <meta charset=\"utf-8\" />",
        "    <title>Index des fiches produits</title>",
        "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
        "    <link rel=\"stylesheet\" href=\"../styles/catalog-page.css\" />",
        "  </head>",
        "  <body>",
        "    <header>",
        "      <h1>Fiches produits</h1>",
        "      <p>Consultez les fiches individuelles générées à partir du fichier CSV.</p>",
        "    </header>",
        "    <main>",
        "      <ul class=\"product-list\">",
    ]

    for product in products:
        name = product.get("Nom commercial", "Produit sans nom").strip() or "Produit sans nom"
        filename = product["__filename"]
        parts.append(
            f"        <li><a href=\"{html.escape(filename)}\">{html.escape(name)}</a></li>"
        )

    parts.extend(
        [
            "      </ul>",
            "    </main>",
            "    <footer>",
            "      <p>© Deviseur – Catalogue produits</p>",
            "    </footer>",
            "  </body>",
            "</html>",
        ]
    )

    return "\n".join(parts) + "\n"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    styles_dir = OUTPUT_DIR.parent / "styles"
    styles_dir.mkdir(parents=True, exist_ok=True)

    with CSV_PATH.open(newline="", encoding="utf-8") as csv_file:
        reader = csv.reader(csv_file, delimiter=";", quotechar="\"")
        try:
            headers = next(reader)
        except StopIteration:
            raise SystemExit("Le fichier CSV est vide.")
        headers = [header.strip() for header in headers]

        products: list[dict[str, str]] = []
        for row in reader:
            if not any(cell.strip() for cell in row):
                continue
            data = {header: value.strip() for header, value in zip(headers, row)}
            # Harmonise keys with espaces résiduels
            if " lien" in data:
                data["lien"] = data.pop(" lien").strip()
            if " image" in data:
                data["image"] = data.pop(" image").strip()

            product_id = data.get("ID Produit Sellsy", "").strip()
            name = data.get("Nom commercial", "").strip()
            filename_base = product_id or slugify(name)
            filename = f"{filename_base}.html"

            # Garantit l'unicité des noms de fichiers
            existing_names = {p["__filename"] for p in products}
            counter = 2
            unique_filename = filename
            while unique_filename in existing_names:
                unique_filename = f"{filename_base}-{counter}.html"
                counter += 1
            filename = unique_filename

            data["__filename"] = filename
            products.append(data)

    # Crée les pages produits
    for product in products:
        page_content = render_product_page(product)
        (OUTPUT_DIR / product["__filename"]).write_text(page_content, encoding="utf-8")

    # Crée l'index
    index_content = render_index_page(products)
    (OUTPUT_DIR / "index.html").write_text(index_content, encoding="utf-8")

    # Ajoute une feuille de style minimale
    stylesheet = """
:root {
  color-scheme: light dark;
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #f1f5f9;
  color: #0f172a;
}

body {
  margin: 0;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  background: #f8fafc;
}

header h1 {
  margin: 0 0 0.5rem;
  font-size: 2rem;
}

header p {
  margin: 0;
  color: #475569;
}

main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.product-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.product-list a {
  display: block;
  padding: 1rem 1.25rem;
  background: white;
  border-radius: 1rem;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.2);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.product-list a:hover,
.product-list a:focus {
  transform: translateY(-2px);
  box-shadow: 0 16px 35px rgba(15, 23, 42, 0.08);
}

.breadcrumbs a {
  color: #2563eb;
  text-decoration: none;
}

main section {
  background: white;
  padding: 1.5rem;
  border-radius: 1.25rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

meta {
  color: #475569;
}

.meta {
  margin: 0.25rem 0;
  color: #475569;
}

.tariff-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.75rem;
}

.tariff-list li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-variant-numeric: tabular-nums;
}

.product-image img {
  max-width: 100%;
  height: auto;
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

footer {
  color: #475569;
  font-size: 0.9rem;
}
"""
    (styles_dir / "catalog-page.css").write_text(stylesheet.strip() + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
