"""Install only this app's launch agents. Secrets stay in the runtime config file."""
from pathlib import Path
import plistlib,subprocess,os
root=Path.cwd();agents=Path.home()/'Library/LaunchAgents';agents.mkdir(exist_ok=True)
node=subprocess.check_output(['which','node'],text=True).strip()
services=[('com.hex.arrow-workspace',[node,'server-dist/index.mjs'],{'KeepAlive':True,'RunAtLoad':True,'ThrottleInterval':15,'EnvironmentVariables':{'PORT':'4196','ARROW_HOST':'127.0.0.1','ARROW_CONFIG':str(root/'.runtime/server.json')}}),('com.hex.arrow-workspace-backup',[node,'scripts/backup.mjs'],{'StartInterval':86400,'EnvironmentVariables':{'PATH':os.environ['PATH']}})]
for label,args,settings in services:
 target=agents/(label+'.plist')
 config={'Label':label,'ProgramArguments':args,'WorkingDirectory':str(root),'StandardOutPath':str(root/'.runtime'/(label+'.log')),'StandardErrorPath':str(root/'.runtime'/(label+'.log')),**settings}
 target.write_bytes(plistlib.dumps(config));target.chmod(0o600)
 subprocess.run(['launchctl','bootout','gui/'+str(os.getuid()),str(target)],capture_output=True)
 subprocess.run(['launchctl','bootstrap','gui/'+str(os.getuid()),str(target)],check=True,capture_output=True)
 print(label+': installed')
