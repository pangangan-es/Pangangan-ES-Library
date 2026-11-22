import urllib.request
import json
import os

with open(".env", "r", encoding="utf-8") as f:
    env_lines = f.readlines()

env = {}
for line in env_lines:
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.strip().split("=", 1)
        env[k.strip()] = v.strip()

url = env.get("VITE_SUPABASE_URL")
key = env.get("VITE_SUPABASE_ANON_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}"
}

print(f"Connecting to Supabase at {url}...")

# 1. Books
req_books = urllib.request.Request(f"{url}/rest/v1/public_catalog?select=*", headers=headers)
try:
    with urllib.request.urlopen(req_books) as res:
        books = json.loads(res.read())
        print(f"Total public_catalog books: {len(books)}")
        for b in books:
            print(f" - [{b.get('category')}] {b.get('title')} by {b.get('author')} (Avail: {b.get('available_copies')}/{b.get('total_copies')}, featured: {b.get('is_featured')}, sample: {b.get('is_sample')})")
except Exception as e:
    print("Error fetching public_catalog:", e)

# 2. Categories
req_cats = urllib.request.Request(f"{url}/rest/v1/categories?select=*&order=name.asc", headers=headers)
try:
    with urllib.request.urlopen(req_cats) as res:
        cats = json.loads(res.read())
        print(f"\nTotal categories: {len(cats)}")
        for c in cats:
            print(f" - {c.get('name')} (active: {c.get('is_active')})")
except Exception as e:
    print("Error fetching categories:", e)

# 3. Announcements
req_ann = urllib.request.Request(f"{url}/rest/v1/announcements?select=*&order=created_at.desc", headers=headers)
try:
    with urllib.request.urlopen(req_ann) as res:
        anns = json.loads(res.read())
        print(f"\nTotal announcements: {len(anns)}")
        for a in anns:
            print(f" - [{a.get('badge')}] {a.get('title')} (date: {a.get('event_date')})")
except Exception as e:
    print("Error fetching announcements:", e)
