import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import mobileAds, {
  AdEventType, AdsConsent, BannerAd, BannerAdSize,
  InterstitialAd, TestIds,
} from 'react-native-google-mobile-ads';

// Real Google SDK sample IDs. Never production units or custom-drawn ad views.
const BANNER_UNIT_ID = TestIds.BANNER;
const INTERSTITIAL_UNIT_ID = TestIds.INTERSTITIAL;
const COOLDOWN_MS = 180_000;
type Screen = 1 | 2;

function BottomBanner({ enabled }: { enabled: boolean }) {
  return (
    <View style={styles.bannerSlot}>
      {enabled ? (
        <BannerAd unitId={BANNER_UNIT_ID} size={BannerAdSize.BANNER} />
      ) : null}
    </View>
  );
}

function AppContent() {
  const [screen, setScreen] = useState<Screen>(1);
  const [adsReady, setAdsReady] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adsStatus, setAdsStatus] = useState('Khởi tạo SDK / xin quyền quảng cáo...');

  // Singleton per app mount, not per screen. Both directions share one cooldown.
  const adRef = useRef(InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID));
  const loadedRef = useRef(false);
  const presentingRef = useRef(false);
  const pendingScreenRef = useRef<Screen | null>(null);
  const lastShownAtRef = useRef<number | null>(null);
  const adsEnabledRef = useRef(false);
  const busyRef = useRef(false);

  const finishNavigation = useCallback(() => {
    const target = pendingScreenRef.current;
    pendingScreenRef.current = null;
    presentingRef.current = false;
    busyRef.current = false;
    setBusy(false);
    if (target !== null) setScreen(target);
  }, []);

  useEffect(() => {
    let mounted = true;
    const ad = adRef.current;
    const setLoaded = (value: boolean) => {
      loadedRef.current = value;
      if (mounted) setInterstitialLoaded(value);
    };

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      if (mounted) setLoaded(true);
    });
    const unsubOpened = ad.addAdEventListener(AdEventType.OPENED, () => {
      // Only count ads that the SDK actually opened, not failed show attempts.
      presentingRef.current = true;
      lastShownAtRef.current = Date.now();
      if (mounted) setAdsStatus('Interstitial đã mở');
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      if (!mounted) return;
      setLoaded(false);
      finishNavigation(); // Navigate AFTER Google's fullscreen ad is dismissed.
      if (adsEnabledRef.current) ad.load(); // Preload next ad; cooldown still applies.
    });
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, error => {
      if (!mounted) return;
      console.warn('AdMob interstitial error', error);
      setLoaded(false);
      setAdsStatus('Interstitial lỗi hoặc không khả dụng');
      // An error before opening must never block navigation.
      // An opened ad should be dismissed by SDK and emit CLOSED first.
      if (!presentingRef.current) finishNavigation();
    });

    async function initializeAds() {
      try {
        const consent = await AdsConsent.gatherConsent();
        if (!mounted) return;
        if (!consent.canRequestAds) {
          setAdsStatus('Chưa được phép yêu cầu quảng cáo; điều hướng vẫn hoạt động');
          return;
        }
        await mobileAds().initialize();
        if (!mounted) return;
        adsEnabledRef.current = true;
        setAdsReady(true);
        setAdsStatus('Google SDK đã sẵn sàng');
        ad.load();
      } catch (error) {
        console.warn('AdMob initialization/consent error', error);
        if (mounted) setAdsStatus('Không thể khởi tạo quảng cáo; vẫn chuyển trang bình thường');
      }
    }
    void initializeAds();
    return () => {
      mounted = false;
      adsEnabledRef.current = false;
      unsubLoaded(); unsubOpened(); unsubClosed(); unsubError();
    };
  }, [finishNavigation]);

  const navigate = useCallback((target: Screen) => {
    if (busyRef.current || target === screen) return;
    busyRef.current = true;
    setBusy(true);
    pendingScreenRef.current = target;
    const now = Date.now();
    const last = lastShownAtRef.current;
    const allowedByCooldown = last === null || (now >= last && now - last >= COOLDOWN_MS);

    if (!adsEnabledRef.current || !loadedRef.current || !allowedByCooldown) {
      finishNavigation(); // Ad missing, loading or cooling down: never trap user.
      return;
    }
    // Reserve this loaded ad for exactly one transition (avoid double clicks).
    loadedRef.current = false;
    setInterstitialLoaded(false);
    adRef.current.show().catch(error => {
      console.warn('Interstitial show failed', error);
      // If SDK actually opened the ad, wait for CLOSED, never navigate here.
      if (!presentingRef.current) {
        finishNavigation();
        if (adsEnabledRef.current) adRef.current.load();
      }
    });
  }, [finishNavigation, screen]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.main}>
        <Text style={styles.eyebrow}>REACT NATIVE + GOOGLE ADMOB</Text>
        <Text style={styles.title}>Hello World 👋</Text>
        <Text style={styles.heading}>Trang {screen}</Text>
        <Text style={styles.description}>Đây là màn hình {screen} trong ứng dụng demo.</Text>
        <Pressable
          testID="navigate-button"
          accessibilityRole="button"
          disabled={busy}
          style={({ pressed }) => [styles.button, (pressed || busy) && styles.buttonDisabled]}
          onPress={() => navigate(screen === 1 ? 2 : 1)}
        >
          {busy ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.buttonText}>
              {screen === 1 ? 'Chuyển sang trang 2 →' : '← Quay lại trang 1'}
            </Text>
          )}
        </Pressable>
        <Text style={styles.hint}>Interstitial: tối đa 1 lần / 3 phút trên toàn ứng dụng.</Text>
        <Text style={styles.status}>SDK: {adsStatus}</Text>
        <Text style={styles.status}>Interstitial đã tải: {interstitialLoaded ? 'Có' : 'Chưa'}</Text>
      </View>
      <BottomBanner enabled={adsReady} />
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  main: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  eyebrow: { color: '#64748b', letterSpacing: 1.5, fontSize: 11, fontWeight: '700' },
  title: { color: '#0f172a', fontWeight: '800', fontSize: 32, marginTop: 12 },
  heading: { color: '#2563eb', fontSize: 25, fontWeight: '700', marginTop: 14 },
  description: { color: '#475569', marginTop: 8, fontSize: 15, textAlign: 'center' },
  button: { backgroundColor: '#2563eb', marginTop: 30, paddingVertical: 16,
    paddingHorizontal: 26, borderRadius: 14, minWidth: 245, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { color: '#64748b', marginTop: 20, textAlign: 'center', fontSize: 12 },
  status: { color: '#64748b', marginTop: 7, textAlign: 'center', fontSize: 12 },
  bannerSlot: { minHeight: 60, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
});
