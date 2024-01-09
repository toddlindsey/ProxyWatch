import { app, Tray, nativeImage, Notification, Menu } from 'electron';
import path from 'path';
import { exec } from 'child_process';
import AutoLaunch from 'auto-launch';

var autoLauncher = new AutoLaunch({
    name: "ProxyWatch"
});

let autoLaunchOn = false;

autoLauncher.isEnabled().then(isEnabled => {
    autoLaunchOn = isEnabled;
    return app.whenReady();    
}).then(() => {

  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
  const tray = new Tray(icon);
  tray.setToolTip('ProxyWatch');

  function enableDisableAutoLaunch() {

    if (!autoLaunchOn) {
        autoLauncher.enable();
        autoLaunchOn = true;
    }
    else {
        autoLauncher.disable();
        autoLaunchOn = false;
    }

    const notification = new Notification({
        title: 'ProxyWatch',
        body: autoLaunchOn ? 'ProxyWatch will now run automatically.' : 'ProxyWatch will no longer run automatically.'
    });
    notification.show();
  }

  function rebuildMenu() {

    // Create a context menu for the tray icon
    const contextMenu = Menu.buildFromTemplate([
        {
            label: autoLaunchOn ? 'Disable Run on Startup (currently ON)' : 'Enable Run on Startup (currently OFF)',
            click: () => {
                enableDisableAutoLaunch();
                rebuildMenu();
            }
        },
        {
            label: 'Exit',
            click: () => { app.quit(); }
        }
    ]);

    // Set the context menu to the tray icon
    tray.setContextMenu(contextMenu);
  }

  // Function to reset proxy settings
  function resetProxySettings() {
    exec('reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error resetting proxy settings: ${error}`);
        return;
      }
      const notification = new Notification({
        title: 'ProxyWatch',
        body: 'Proxy settings have been reset to default.',
      });
      notification.show();
    });
  }

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  const checkProxySettings = () => {
    exec('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error querying proxy settings: ${error}`);
        return;
      }
      const match = stdout.match(/ProxyEnable\s+REG_DWORD\s+0x(\d+)/i);
      if (match && match[1]) {
        const proxyEnabled = parseInt(match[1], 16);
        if (proxyEnabled === 1) {
          resetProxySettings();
        }
      }
    });
  };

  rebuildMenu();
  setInterval(checkProxySettings, 5000); // Check every 5 seconds
});
