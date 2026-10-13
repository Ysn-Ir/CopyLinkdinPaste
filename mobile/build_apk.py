import os
import sys
import shutil
import subprocess

def build():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    android_dir = os.path.join(root_dir, 'mobile', 'android')
    
    java_home = r"C:\Program Files\Java\jdk-21"
    android_home = r"C:\Users\khali\AppData\Local\Android\Sdk"
    
    env = os.environ.copy()
    env["JAVA_HOME"] = java_home
    env["ANDROID_HOME"] = android_home
    env["ANDROID_SDK_ROOT"] = android_home
    env["PATH"] = os.path.join(java_home, "bin") + ";" + os.path.join(android_home, "platform-tools") + ";" + env.get("PATH", "")
    
    gradlew_bat = os.path.join(android_dir, "gradlew.bat")
    
    print(f"[*] Starting Gradle build in: {android_dir}")
    print(f"[*] JAVA_HOME: {java_home}")
    print(f"[*] ANDROID_HOME: {android_home}")
    
    cmd = [gradlew_bat, "assembleRelease", "--stacktrace", "--console=plain"]
    
    proc = subprocess.Popen(
        cmd,
        cwd=android_dir,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    for line in iter(proc.stdout.readline, ''):
        print(line, end='', flush=True)
        
    proc.stdout.close()
    return_code = proc.wait()
    
    if return_code != 0:
        print(f"\n[!] Gradle build failed with exit code {return_code}")
        return False
        
    print("\n[+] Gradle assembleRelease succeeded!")
    
    # Locate output APK
    apk_search_dir = os.path.join(android_dir, 'app', 'build', 'outputs', 'apk', 'release')
    found_apk = None
    if os.path.exists(apk_search_dir):
        for f in os.listdir(apk_search_dir):
            if f.endswith('.apk'):
                found_apk = os.path.join(apk_search_dir, f)
                break
                
    if found_apk and os.path.exists(found_apk):
        dest_apk = os.path.join(root_dir, 'omnihunt-mobile.apk')
        shutil.copy2(found_apk, dest_apk)
        # Also copy to legacy name for compatibility
        shutil.copy2(found_apk, os.path.join(root_dir, 'pfe-hunter-mobile.apk'))
        print(f"[+] Output APK copied to: {dest_apk} ({os.path.getsize(dest_apk) // 1024} KB)")
        return True
    else:
        print(f"[!] Could not find generated APK in {apk_search_dir}")
        return False

if __name__ == '__main__':
    success = build()
    sys.exit(0 if success else 1)
