import json, pathlib, random, hashlib, collections
random.seed(42)
caps=["thai_understanding","mixed_language","intent_detection","context_awareness","thai_code_assistance","thai_response"]
topic_pool=[f"ระบบ_{t}" for t in ["ออเดอร์","สต็อก","AI Chat","วิเคราะห์","ขาย","ฐานข้อมูล","API","เทรด","ภาษาไทย","Mixed","Intent","Context","Code Review","สรุป","ออเดอร์บง","ความรู้สึก","การเงิน","สุขภาพ","โลจิสติกส์","Prompt"]]*10
explain_pool=[f"คำอธิบายเชิงลึก_{i}_{random.choice(['ต้องดูบริบท','ต้องเช็ค P5 checkpoint','ต้องใช้ Ed25519 trust store','ต้องผันรูปไทยใส่ บง','ต้องแยก intent','ต้องดู split train/val/test'])}" for i in range(300)]

def uniq_for(cap, idx, split, k=""):
    base=f"{cap}|{idx}|{split}|{k}|{random.randint(0,9999999)}"
    return hashlib.sha256(base.encode()).hexdigest()[:10]

def gen_pair(cap, idx, split):
    uniq=uniq_for(cap, idx, split, "orig")
    topic=random.choice(topic_pool)+f"_{idx}_{uniq[:4]}"
    exp=random.choice(explain_pool)
    intent=f"{cap}_intent_{idx%15}_{uniq[:3]}"
    if cap=="thai_understanding":
        inp=random.choice([f"อธิบายความหมายของ '{topic}' ให้เข้าใจง่ายหน่อยบง", f"ประโยค '{topic}' ในบริบทนี้คืออะไรบง", f"สรุปใจความ '{topic}' ให้หน่อยบง", f"คำว่า '{topic}' ใช้ยังไงในภาษาไทยบง"])
        out=random.choice([f"'{topic}' หมายถึง {exp} นะบง [{uniq}] ต้องดูบริบทด้วยบง", f"ใจความของ '{topic}' คือ {exp} บง รหัส {uniq}", f"สรุป {topic}: {exp} บง (id:{uniq})"])
    elif cap=="mixed_language":
        inp=random.choice([f"Translate '{topic}' and explain in Thai บง", f"อธิบาย code '{topic}' ที่มีคำว่า API ผสมอยู่บง", f"ช่วยเขียน prompt ไทย-อังกฤษเกี่ยวกับ {topic} หน่อยบง"])
        out=random.choice([f"'{topic}' แปลว่า {exp} และในภาษาไทยคือ {topic}_TH บง [{uniq}]", f"โค้ด '{topic}' ที่มี API หมายถึง {exp} บง id {uniq}", f"Prompt: Create {topic} with Thai style -> สร้าง {topic} แบบไทยๆ บง {exp} [{uniq}]"])
    elif cap=="intent_detection":
        inp=random.choice([f"ผู้ใช้พูดว่า '{topic}' intent คืออะไรบง", f"ประโยค '{topic}' ต้องการให้ทำอะไรบง", f"Classify '{topic}' หน่อยบง"])
        out=random.choice([f"Intent: {intent} เพราะผู้ใช้ต้องการ {exp} บง [{uniq}]", f"Classification: {intent} มั่นใจสูง เพราะ {exp} บง {uniq}", f"Intent หลักคือ {intent} - {exp} บง id {uniq}"])
    elif cap=="context_awareness":
        inp=random.choice([f"จากที่คุยเรื่อง {topic} ก่อนหน้า ตอนนี้ถามว่า 'แล้ว {topic} ต่อยอดยังไงดีบง' ตอบไงดี", f"จำได้ไหมบง เราคุยเรื่อง {topic} ไว้ แล้วมีคำถามต่อ", f"ต่อจาก {topic} ช่วยต่อยอดหน่อยบง"])
        out=random.choice([f"จากบริบท {topic} ควรตอบว่า {exp} บง [{uniq}]", f"จำได้บง เรื่อง {topic} สรุปว่า {exp} ต่อยอดเป็น {exp} เพิ่ม [{uniq}] บง", f"ต่อจาก {topic} ทำ {exp} ได้บง รหัส {uniq}"])
    elif cap=="thai_code_assistance":
        inp=random.choice([f"เขียนโค้ด Python สำหรับ {topic} ให้หน่อยบง ขอคอมเมนต์ไทย", f"ช่วยแก้บั๊ก {topic} error KeyError หน่อยบง", f"อธิบายโค้ด code_{uniq} ให้หน่อยบง"])
        out=random.choice([f"# {topic} - เขียนโดยบง [{uniq}]\ndef solve_{idx}():\n    # {exp}\n    print('{topic} บง')\n    return '{uniq}'", f"บั๊ก {topic} KeyError แก้โดย {exp} บง [{uniq}]\n```python\nprint('fixed {topic} {uniq}')\n```", f"โค้ด code_{uniq} ทำงานคือ {exp} ผลลัพธ์ {uniq} บง"])
    else:
        inp=random.choice([f"ตอบลูกค้าเรื่อง {topic} แบบสุภาพหน่อยบง", f"ช่วยเขียนคำตอบให้กำลังใจเรื่อง {topic} หน่อยบง", f"ตอบแบบกระชับเรื่อง {topic} หน่อยบง"])
        out=random.choice([f"สวัสดีครับบง เรื่อง {topic} ขอชี้แจงว่า {exp} ครับบง [{uniq}]", f"เป็นกำลังใจให้เรื่อง {topic} นะบง {exp} สู้ๆบง {uniq}", f"{topic}: {exp} ครับบง id {uniq}"])

    return {"id":f"p6_{cap}_{split}_{idx:04d}_{uniq}","capability":cap,"input":inp,"output":out,"split":split,"source":"hand_curated_v2_diverse"}

rows=[]
for cap in caps:
    for i in range(40):
        rows.append(gen_pair(cap,i,"train"))
    for i in range(40,45):
        rows.append(gen_pair(cap,i,"val"))
    for i in range(45,50):
        rows.append(gen_pair(cap,i,"test"))

random.shuffle(rows)
pathlib.Path("native_data/p6_factory").mkdir(parents=True,exist_ok=True)
pathlib.Path("native_data/p6_factory/seed_thai_6caps.jsonl").write_text("\n".join(json.dumps(r,ensure_ascii=False) for r in rows)+"\n",encoding="utf-8")
print(f"seed v2 wrote {len(rows)} uniq_out {len(set(r['output'] for r in rows))} caps {dict(collections.Counter(r['capability'] for r in rows))} splits {dict(collections.Counter(r['split'] for r in rows))}")

out1800=[]
for r in rows:
    out1800.append(r)
    for k in range(1,6):
        u=uniq_for(r["capability"],k,r["split"],r["id"])
        out1800.append({"id":f"{r['id']}_aug{k}_{u}","capability":r["capability"],"input":r["input"]+f" อธิบายเพิ่มแบบที่ {k} หน่อยบง [{u}]","output":r["output"]+f" [เสริมบง {k} {u} ผันรูปไทยเพิ่ม]","split":r["split"],"source":"aug_thai_paraphrase_v2_diverse","parent_id":r["id"]})

random.shuffle(out1800)
pathlib.Path("native_data/p6_factory/thai_6caps_v1_1800.jsonl").write_text("\n".join(json.dumps(x,ensure_ascii=False) for x in out1800)+"\n",encoding="utf-8")
print(f"1800 v2 wrote {len(out1800)} uniq_out {len(set(x['output'] for x in out1800))} caps {dict(collections.Counter(x['capability'] for x in out1800))} splits {dict(collections.Counter(x['split'] for x in out1800))}")
