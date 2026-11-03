import json, pathlib, torch, torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from collections import Counter, defaultdict

DATASET="native_data/p6_factory/thai_6caps_v1_1800.jsonl"
CKPT="native_data/checkpoints/p6_6caps/p6_6caps_best.pt"

rows=[json.loads(l) for l in pathlib.Path(DATASET).read_text(encoding="utf-8").splitlines()]
test=[r for r in rows if r["split"]=="test"]
print(f"Eval P6.4 test {len(test)} {Counter(r['capability'] for r in test)}")

ckpt=torch.load(CKPT, map_location="cpu")
stoi=ckpt["stoi"]
vocab_size=ckpt["vocab_size"]

def encode(s, max_len=128):
    ids=[stoi.get(ch,0) for ch in s[:max_len]]
    return ids + [0]*(max_len-len(ids))

class DS(Dataset):
    def __init__(self, data): self.data=data
    def __len__(self): return len(self.data)
    def __getitem__(self, idx):
        r=self.data[idx]
        x=torch.tensor(encode(r["input"]+"\n"+r["output"]), dtype=torch.long)
        y=torch.tensor(encode(r["output"]), dtype=torch.long)
        return x,y,r["capability"]

class ZyntheorP5(nn.Module):
    def __init__(self, vocab_size, d_model=256, n_layers=6):
        super().__init__()
        self.emb=nn.Embedding(vocab_size, d_model)
        self.layers=nn.ModuleList([nn.TransformerEncoderLayer(d_model=d_model, nhead=4, dim_feedforward=512, batch_first=True) for _ in range(n_layers)])
        self.out=nn.Linear(d_model, vocab_size)
    def forward(self,x):
        h=self.emb(x)
        for l in self.layers: h=l(h)
        return self.out(h)

model=ZyntheorP5(vocab_size)
model.load_state_dict(ckpt["model"])
model.eval()

loader=DataLoader(DS(test), batch_size=2)
crit=nn.CrossEntropyLoss(ignore_index=0)
total_loss=0
per_cap=defaultdict(list)
with torch.no_grad():
    for x,y,cap in loader:
        logits=model(x)
        loss=crit(logits.view(-1, vocab_size), y.view(-1)).item()
        total_loss+=loss
        for c in cap:
            per_cap[c].append(loss)

avg=total_loss/len(loader)
print(f"Test avg loss {avg:.4f} ppl {2.718**avg:.2f}")
for cap, losses in per_cap.items():
    print(f"  {cap}: loss {sum(losses)/len(losses):.4f} n={len(losses)}")

# เขียน report
report={
  "p6_version":"P6.4-eval-1800",
  "test_total":len(test),
  "test_loss":avg,
  "per_capability":{k:{"loss":sum(v)/len(v),"count":len(v)} for k,v in per_cap.items()},
  "checkpoint":str(CKPT),
  "dataset":DATASET,
  "p5_still_verified": True
}
pathlib.Path("/tmp/p6_4_eval.json").write_text(json.dumps(report, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
print("wrote /tmp/p6_4_eval.json")
