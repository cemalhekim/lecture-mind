#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import cgi, json, os, re, shutil, subprocess, tempfile, threading, time

ROOT=Path(__file__).resolve().parent
SEMESTERS=Path(os.environ.get("LECTUREMIND_SEMESTERS", Path.home()/"Documents/Semesters")).expanduser()
CODEX=Path.home()/".local/bin/codex"
os.chdir(ROOT)

def slug(s): return re.sub(r"[^a-z0-9]+","-",s.lower()).strip("-")[:70]
CATALOG=[]

def refresh_catalog():
    rows=[]
    if not SEMESTERS.exists(): return
    try: paths=subprocess.run(["find",str(SEMESTERS),"-maxdepth","5","-type","f","-iname","*.pdf"],capture_output=True,text=True,timeout=180).stdout.splitlines()
    except Exception: return
    for raw in paths:
        p=Path(raw)
        rel=p.relative_to(SEMESTERS); parts=rel.parts
        if len(parts)<3: continue
        semester=parts[0]; module=parts[1].replace("_Organized","").replace("_"," ")
        rows.append({"semester":semester,"module":module,"title":p.stem.replace("_"," "),"filename":p.name,"path":str(p)})
    if rows: CATALOG[:]=sorted(rows,key=lambda x:(x["semester"],x["module"],x["title"]))

class Handler(SimpleHTTPRequestHandler):
    def json(self,data,status=200):
        raw=json.dumps(data,ensure_ascii=False).encode(); self.send_response(status); self.send_header("Content-Type","application/json; charset=utf-8"); self.send_header("Content-Length",str(len(raw))); self.end_headers(); self.wfile.write(raw)
    def do_GET(self):
        u=urlparse(self.path)
        if u.path=="/api/catalog": return self.json(CATALOG)
        if u.path=="/api/map":
            ident=parse_qs(u.query).get("id",[""])[0]; p=ROOT/"data/maps"/(slug(ident)+".json")
            return self.json(json.loads(p.read_text())) if p.exists() else self.json({"error":"Map not found"},404)
        return super().do_GET()
    def do_POST(self):
        if urlparse(self.path).path!="/api/generate": return self.json({"error":"Not found"},404)
        try:
            if self.headers.get_content_type()=="multipart/form-data":
                form=cgi.FieldStorage(fp=self.rfile,headers=self.headers,environ={"REQUEST_METHOD":"POST","CONTENT_TYPE":self.headers["Content-Type"]}); item=form["pdf"]
                source=ROOT/"imports"/(slug(Path(item.filename).stem)+".pdf"); source.write_bytes(item.file.read())
            else:
                size=int(self.headers.get("Content-Length",0)); source=Path(json.loads(self.rfile.read(size))["path"]).expanduser().resolve()
            if source.suffix.lower()!=".pdf" or not source.exists(): raise ValueError("A readable PDF is required")
            ident=slug(source.stem)+"-"+str(int(time.time())); output=ROOT/"data/maps"/(ident+".json")
            prompt=f'''Analyze the lecture PDF at {source}. Return ONLY JSON matching the supplied schema. Build an intuition-first learning dependency map, not a page summary. Every concept must explain the problem, motivation, physical intuition, connection, beginner misconception, equation, and source page. Use 6-14 concepts and concise text. Set id to "{ident}".'''
            cmd=[str(CODEX),"exec","--ephemeral","--skip-git-repo-check","--dangerously-bypass-approvals-and-sandbox","-C",str(ROOT),"--add-dir",str(source.parent),"--output-schema",str(ROOT/"mindmap.schema.json"),"-o",str(output),prompt]
            subprocess.run(cmd,check=True,timeout=900,capture_output=True,text=True)
            data=json.loads(output.read_text()); self.json({"id":ident,"title":data["title"],"semester":"Generated","module":data.get("module","Lecture"),"lecture":source.name,"concepts":len(data["concepts"])})
        except subprocess.TimeoutExpired: self.json({"error":"Codex generation timed out"},504)
        except Exception as e: self.json({"error":str(e)},500)

print("LectureMind: http://127.0.0.1:4174")
threading.Thread(target=refresh_catalog,daemon=True).start()
ThreadingHTTPServer(("127.0.0.1",4174),Handler).serve_forever()
