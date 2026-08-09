import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CareProfileProvider } from '../src/context/CareProfileContext';
import { ActivityLogProvider } from '../src/context/ActivityLogContext';
import { DailyCareProvider } from '../src/context/DailyCareContext';
import { MessageProvider } from '../src/context/MessageContext';
import { DemoFlowProvider } from '../src/context/DemoFlowContext';
import { Colors, Fonts } from '../src/design/tokens';

type Defaultable = { defaultProps?: { style?: unknown } };
let typographyConfigured = false;

function configureTypography() {
  if (typographyConfigured) return;
  typographyConfigured = true;
  const text = Text as unknown as Defaultable;
  const input = TextInput as unknown as Defaultable;
  text.defaultProps = { ...text.defaultProps, style: [{ fontFamily: Fonts.body }, text.defaultProps?.style] };
  input.defaultProps = { ...input.defaultProps, style: [{ fontFamily: Fonts.body }, input.defaultProps?.style] };
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'FoundersGrotesk-Regular': require('../assets/fonts/FoundersGrotesk-Regular.otf'),
    'FoundersGrotesk-Medium': require('../assets/fonts/FoundersGrotesk-Medium.otf'),
    'FoundersGrotesk-Semibold': require('../assets/fonts/FoundersGrotesk-Semibold.otf'),
    'InstrumentSans-Regular': require('../assets/fonts/InstrumentSans-Regular.ttf'),
    'InstrumentSans-Medium': require('../assets/fonts/InstrumentSans-Medium.ttf'),
    'InstrumentSans-SemiBold': require('../assets/fonts/InstrumentSans-SemiBold.ttf'),
  });

  if (!fontsLoaded) return null;
  configureTypography();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaProvider>
        <CareProfileProvider>
          <DailyCareProvider>
            <ActivityLogProvider>
              <MessageProvider>
                <DemoFlowProvider>
                  <StatusBar style="light" backgroundColor={Colors.ink} />
                  <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
                </DemoFlowProvider>
              </MessageProvider>
            </ActivityLogProvider>
          </DailyCareProvider>
        </CareProfileProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
