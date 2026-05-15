#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <Firebase/Firebase.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure];

  self.dependencyProvider = [RCTAppDependencyProvider new];
  self.moduleName = @"AirportDutyManagement";
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [NSURL URLWithString:@"http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
