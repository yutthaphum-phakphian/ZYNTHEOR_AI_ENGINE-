import json, pathlib, hashlib, torch, torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from collections import Counter

DATASET="native_data/p6_factory/thai_6caps_v1_1800.jsonl"
CKPT_DIR=pathlib.Path("native_data/checkpoints/p6_6caps")
CKPT_DIR.mkdir(parents=True, exist_ok=True)

rows=[json.loads(l) for l in pathlib.Path(DATASET).read_text(encoding="utf-8").splitlines()]
train=[r for r in rows if r["split"]=="train"]
val=[r for r in rows if r["split"]=="val"]
print(f"P6.3 dataset {len(rows)} train {len(train)} val {len(val)} diverse {len(set(r['output'] for r in rows))}")

# vocab char-level แบบ P5
all_text="".join(r["input"]+" "+r["output"] for r in rows)[:200000]
chars=sorted(set(all_text))
stoi={ch:i+1 for i,ch in enumerate(chars)}
stoi["<pad>"]=0
vocab_size=len(stoi)+5
print(f"vocab {vocab_size}")

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
        return x,y

class ZyntheorP5(nn.Module):
    def __init__(self, vocab_size, d_model=256, n_layers=6):
        super().__init__()
        self.emb=nn.Embedding(vocab_size, d_model)
        self.layers=nn.ModuleList([nn.TransformerEncoderLayer(d_model=d_model, nhead=4, dim_feedforward=512, batch_first=True) for _ in range(n_layers)])
        self.out=nn.Linear(d_model, vocab_size)
    def forward(self,x):
        h=self.emb(x)
        for layer in self.layers:
            h=layer(h)
        return self.out(h)

device="cpu"
model=ZyntheorP5(vocab_size).to(device)
print(f"Model params {sum(p.numel() for p in model.parameters())}")

# save init checkpoint ทันที กัน FileNotFound
torch.save({"model":model.state_dict(),"vocab_size":vocab_size,"stoi":stoi,"epoch":0}, CKPT_DIR/"p6_6caps_best.pt")
print(f"saved init {CKPT_DIR/'p6_6caps_best.pt'}")

train_ds=DS(train)
val_ds=DS(val)
train_loader=DataLoader(train_ds, batch_size=2, shuffle=True)
val_loader=DataLoader(val_ds, batch_size=2)

crit=nn.CrossEntropyLoss(ignore_index=0)
opt=torch.optim.AdamW(model.parameters(), lr=2e-4)

best=float('inf')
for epoch in range(1,4):
    model.train()
    tot=0
    for i,(x,y) in enumerate(train_loader):
        logits=model(x)
        loss=crit(logits.view(-1, vocab_size), y.view(-1))
        opt.zero_grad()
        loss.backward()
        opt.step()
        tot+=loss.item()
        if i%100==0:
            print(f"epoch {epoch} step {i}/{len(train_loader)} loss {loss.item():.4f}")
    avg_train=tot/len(train_loader)
    model.eval()
    vtot=0
    with torch.no_grad():
        for x,y in val_loader:
            logits=model(x)
            vtot+=crit(logits.view(-1, vocab_size), y.view(-1)).item()
    avg_val=vtot/len(val_loader)
    print(f"Epoch {epoch}/3 Train {avg_train:.4f} Val {avg_val:.4f}")
    if avg_val<best:
        best=avg_val
        torch.save({"model":model.state_dict(),"vocab_size":vocab_size,"stoi":stoi,"epoch":epoch,"train_loss":avg_train,"val_loss":avg_val}, CKPT_DIR/"p6_6caps_best.pt")
        print(f"saved best val {best:.4f}")

final=CKPT_DIR/"p6_6caps_final.pt"
torch.save({"model":model.state_dict(),"vocab_size":vocab_size,"stoi":stoi,"epoch":3}, final)
sha=hashlib.sha256(final.read_bytes()).hexdigest()
print(f"FINAL {final} {final.stat().st_size/1024/1024:.1f} MB SHA {sha[:16]}")
