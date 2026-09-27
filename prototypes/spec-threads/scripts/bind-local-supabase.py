"""Restrict only this project's generated Supabase service ports to loopback.
Old stopped containers/configurations are retained for rollback. Never touches other projects.
"""
import subprocess,json,http.client,socket,urllib.parse,pathlib,os,time
root=pathlib.Path('.runtime/docker-backups');root.mkdir(parents=True,exist_ok=True,mode=0o700)
endpoint=subprocess.check_output(['docker','context','inspect','--format','{{.Endpoints.docker.Host}}'],text=True).strip()
assert endpoint.startswith('unix://')
class UnixHTTP(http.client.HTTPConnection):
 def connect(self):
  self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.connect(endpoint[7:])
def api(method,path,data=None):
 c=UnixHTTP('localhost',timeout=60);c.request(method,'/v1.47'+path,body=json.dumps(data) if data is not None else None,headers={'Content-Type':'application/json'});r=c.getresponse();body=r.read();c.close()
 if r.status>=400: raise RuntimeError(f'Docker operation failed ({r.status}): '+body.decode()[:300])
 return json.loads(body) if body else None
for name in ['supabase_db_arrow-workspace','supabase_kong_arrow-workspace','supabase_studio_arrow-workspace','supabase_inbucket_arrow-workspace','supabase_analytics_arrow-workspace']:
 info=json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
 ports=info['HostConfig'].get('PortBindings') or {}
 if all(p.get('HostIp')=='127.0.0.1' for binds in ports.values() for p in (binds or [])):
  print(name+': already loopback-only');continue
 backup=root/(name+'.json');backup.write_text(json.dumps(info));backup.chmod(0o600)
 for bindings in ports.values():
  for p in bindings or []:p['HostIp']='127.0.0.1'
 config=info['Config'];config['HostConfig']=info['HostConfig']
 config['NetworkingConfig']={'EndpointsConfig':{network:{'Aliases':[name]} for network in info['NetworkSettings']['Networks']}}
 archived=name+'-before-loopback-'+str(int(time.time()))
 api('POST','/containers/'+info['Id']+'/stop?t=15')
 api('POST','/containers/'+info['Id']+'/rename?name='+archived)
 try:
  new=api('POST','/containers/create?name='+name,config)
  if name=='supabase_kong_arrow-workspace':
   files=root/'kong-files';files.mkdir(exist_ok=True,mode=0o700)
   subprocess.run(['docker','cp','-a',archived+':/home/kong/.',str(files)],check=True,capture_output=True)
   subprocess.run(['docker','cp','-a',str(files)+'/.',name+':/home/kong/'],check=True,capture_output=True)
  api('POST','/containers/'+new['Id']+'/start')
  print(name+': bound to loopback; previous container retained')
 except Exception:
  # Preserve both containers for diagnosis; no volume or data deletion.
  print(name+': replacement failed; saved configuration remains in .runtime/docker-backups')
  raise
