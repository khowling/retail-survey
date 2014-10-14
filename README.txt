sudo npm -g install cordova
cordova create posa org.khowling.posa PerfectOSA
cordova plugin add https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin
cordova plugin add org.apache.cordova.device
cordova plugin add org.apache.cordova.console
cordova plugin add org.apache.cordova.statusbar
cordova plugin add org.apache.cordova.network-information
cordova plugin add org.apache.cordova.camera
cordova plugin add org.apache.cordova.media-capture
cordova plugin add org.apache.cordova.media
cordova plugin add org.apache.cordova.splashscreen
cordova plugin add org.apache.cordova.file
cordova plugin add org.apache.cordova.file-transfer
cordova platform add ios

cp in www
cordova prepare
cordova build
cordova emulate ios  --debug --target="iPad"

tail -f  platforms/ios/cordova/console.log


to deploy:

cordova build ios --device
cd platforms/ios/build/device 

 download the CodeSigning Certificate from the apple member site (double-click to ensure it goes into the machines keychain)  - then use the Certificate name in the --sign parameter.
download the “AD Hoc (iOS Distrubution)” provisioning profile, the use the filename in the --embed parameter

xcrun -sdk iphoneos PackageApplication -v "./platforms/ios/build/device/<app>.app" -o "/Users/<home>/<app>.ipa" --sign "iPhone Distribution: <Name>  (XXX)" --embed "/Users/<home>/Downloads/XC_Ad_Hoc_-2.mobileprovision"

check the file is signed OK

codesign -v perfectosa.ipa


