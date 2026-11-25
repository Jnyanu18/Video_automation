import json,re,subprocess,sys,os,concurrent.futures as cf
cat=json.load(open('catalog.json'))
extra={'45033':'beautiful-satellite-shot-of-planet-earth','34352':'part-of-planet-earth-rotating-rapidly-in-space','29351':'video-of-the-earth-slowly-spinning-on-its-axis','101507':'through-clouds-into-green-hills','30403':'down-shot-in-a-german-city-aerial-skyline-view','26940':'top-shot-of-barcelona-city-aerial-shot','27053':'top-aerial-view-of-city-blocks-in-frankfurt','46148':'satellite-view-of-india'}
for k,v in extra.items(): cat.setdefault(k,{'slug':v,'q':['intro']})
ids=sys.argv[1].split(',')
res=sys.argv[2]
os.makedirs(res,exist_ok=True)
urls=json.load(open('urls.json')) if os.path.exists('urls.json') else {}
UA=['-A','Mozilla/5.0']
def get(cid):
    if cid not in urls:
        h=subprocess.run(['curl','-s','-L',*UA,f"https://mixkit.co/free-stock-video/{cat[cid]['slug']}-{cid}/"],capture_output=True,text=True,encoding='utf-8',errors='ignore').stdout
        u=sorted(set(re.findall(r'https://assets\.mixkit\.co/[^"\' ]+\.mp4',h)))
        urls[cid]=u
    u=[x for x in urls[cid] if x.endswith('-360.mp4')] or urls[cid]
    if not u: return cid,'nourl'
    base=u[0].rsplit('-360.mp4',1)[0] if u[0].endswith('-360.mp4') else u[0]
    out=f'{res}/{cid}.mp4'
    if os.path.exists(out) and os.path.getsize(out)>10000: return cid,'cached'
    for r in ([res] if res=='360' else [res,'1080','720']):
        r2 = r
        url=f'{base}-{r2}.mp4'
        p=subprocess.run(['curl','-s','-f',*UA,'-o',out,url])
        if p.returncode==0 and os.path.getsize(out)>10000: return cid,r2
    return cid,'fail'
with cf.ThreadPoolExecutor(8) as ex:
    for cid,st in ex.map(get,ids): print(cid,st,flush=True)
json.dump(urls,open('urls.json','w'),indent=0)
