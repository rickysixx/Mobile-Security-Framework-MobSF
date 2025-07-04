Java.perform(function() {
    var androidVersion = parseInt(Java.androidVersion, 10) 
    if (androidVersion > 6){
        try{
            // Generic SSL Pinning Bypass tested on Android 7, 7.1, 8, and 9
            // https://android.googlesource.com/platform/external/conscrypt/+/1186465/src/platform/java/org/conscrypt/TrustManagerImpl.java#391
            var TrustManagerImpl = Java.use('com.android.org.conscrypt.TrustManagerImpl');
            TrustManagerImpl.checkTrustedRecursive.implementation = function(certs, host, clientAuth, untrustedChain, trustedChain, used) {
                send('[SSL Pinning Bypass] checkTrustedRecursive() bypassed');
                return Java.use('java.util.ArrayList').$new();
            }
        }catch (err) {
            send('[SSL Pinning Bypass] TrustManagerImpl.checkTrustedRecursive() not found');
        }
        try {
            var TrustManagerImpl2 = Java.use('com.android.org.conscrypt.TrustManagerImpl');
            TrustManagerImpl2.verifyChain.implementation = function (untrustedChain, trustAnchorChain, host, clientAuth, ocspData, tlsSctData) {
                send('[SSL Pinning Bypass] verifyChain() bypassed for: ' + host);
                return untrustedChain;
            }
        } catch (err) {
            send('[SSL Pinning Bypass] TrustManagerImpl.verifyChain() not found');
        }
        try {
            var ConscryptFileDescriptorSocket = Java.use('com.android.org.conscrypt.ConscryptFileDescriptorSocket');
            ConscryptFileDescriptorSocket.verifyCertificateChain.implementation = function (certChain, authMethod) {
                send('[SSL Pinning Bypass] verifyCertificateChain() bypassed');
                return;
            }
        } catch (err) {
            send('[SSL Pinning Bypass] ConscryptFileDescriptorSocket.verifyCertificateChain() not found');
        }
    } else if (androidVersion > 4 && androidVersion < 7) {
        // Generic SSL Pinning Bypass tested on Android 5, 5,1, 6
        // https://codeshare.frida.re/@akabe1/frida-universal-pinning-bypasser/
        try {
            var OpenSSLSocketImpl = Java.use('com.android.org.conscrypt.OpenSSLSocketImpl');
            OpenSSLSocketImpl.verifyCertificateChain.implementation = function (certRefs, authMethod) {
                send('[SSL Pinning Bypass] OpenSSLSocketImpl.verifyCertificateChain() bypassed');
                return;
            }
        } catch (err) {
            send('[SSL Pinning Bypass] OpenSSLSocketImpl.verifyCertificateChain() not found');
        }
    }
    // 3rd Party Pinning
    try{
        var OkHttpClient = Java.use('com.squareup.okhttp.OkHttpClient');
        OkHttpClient.setCertificatePinner.implementation = function(certificatePinner){
            send('[SSL Pinning Bypass] OkHttpClient.setCertificatePinner() bypassed');
            return this;
        };
        // Invalidate the certificate pinnet checks (if 'setCertificatePinner' was called before the previous invalidation)
        var CertificatePinner = Java.use('com.squareup.okhttp.CertificatePinner');
        CertificatePinner.check.overload('java.lang.String', '[Ljava.security.cert.Certificate;').implementation = function(p0, p1){
            send('[SSL Pinning Bypass] CertificatePinner.check() 1 bypassed');
            return;
        };
        CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function(p0, p1){
            send('[SSL Pinning Bypass] CertificatePinner.check() 2 bypassed');
            return;
        };
    } catch(err) {
        send('[SSL Pinning Bypass] okhttp CertificatePinner not found');
    }
    try {
        var CertificatePinner2 = Java.use('okhttp3.CertificatePinner');
        
        // Hook all check method overloads
        CertificatePinner2.check.overload('java.lang.String', 'java.util.List').implementation = function (hostname, certificates) {
            send('[SSL Pinning Bypass] okhttp3.CertificatePinner.check(String, List) bypassed for ' + hostname);
            return;
        };
        
        CertificatePinner2.check.overload('java.lang.String', '[Ljava.security.cert.Certificate;').implementation = function (hostname, certificates) {
            send('[SSL Pinning Bypass] okhttp3.CertificatePinner.check(String, Certificate[]) bypassed for ' + hostname);
            return;
        };
        
        // Additional check method overload that might exist
        try {
            CertificatePinner2.check.overload('java.lang.String', 'java.util.List', 'java.lang.String').implementation = function (hostname, certificates, algorithm) {
                send('[SSL Pinning Bypass] okhttp3.CertificatePinner.check(String, List, String) bypassed for ' + hostname);
                return;
            };
        } catch(e) {}
        
        // Hook the internal pin checking method
        try {
            CertificatePinner2.check$okhttp.implementation = function (hostname, certificates) {
                send('[SSL Pinning Bypass] okhttp3.CertificatePinner.check$okhttp bypassed for ' + hostname);
                return;
            };
        } catch(e) {}
        
    } catch(err) {
        send('[SSL Pinning Bypass] okhttp3 CertificatePinner not found');
    }
    
    // Comprehensive OkHttp3 bypass combining all approaches to avoid redeclaration
    try {
        var OkHttpClient = Java.use('okhttp3.OkHttpClient');
        var OkHttpClientBuilder = Java.use('okhttp3.OkHttpClient$Builder');
        var CertificatePinner = Java.use('okhttp3.CertificatePinner');
        
        // Create empty certificate pinner
        var EmptyCertificatePinner = CertificatePinner.Builder.$new().build();
        
        // Bypass certificate pinner in builder
        OkHttpClientBuilder.certificatePinner.implementation = function(certificatePinner) {
            send('[SSL Pinning Bypass] okhttp3.OkHttpClient.Builder.certificatePinner() bypassed');
            return this;
        };
        
        OkHttpClientBuilder.build.implementation = function() {
            var client = this.build();
            try {
                // Try to replace certificate pinner with empty one
                var certificatePinnerField = OkHttpClient.class.getDeclaredField('certificatePinner');
                certificatePinnerField.setAccessible(true);
                certificatePinnerField.set(client, EmptyCertificatePinner);
                send('[SSL Pinning Bypass] okhttp3.OkHttpClient certificate pinner replaced with empty pinner');
            } catch (e) {
                send('[SSL Pinning Bypass] Failed to replace certificate pinner: ' + e);
            }
            return client;
        };
        
        // Hook findMatchingPins method if it exists
        try {
            CertificatePinner.findMatchingPins.implementation = function(hostname) {
                send('[SSL Pinning Bypass] okhttp3.CertificatePinner.findMatchingPins() bypassed for ' + hostname);
                var ArrayList = Java.use('java.util.ArrayList');
                return ArrayList.$new(); // Return empty list
            };
        } catch(e) {}
        
        // Hook sha256 method if it exists
        try {
            CertificatePinner.sha256Hash.implementation = function(certificate) {
                send('[SSL Pinning Bypass] okhttp3.CertificatePinner.sha256Hash() bypassed');
                // Return a dummy hash that will match
                var ByteString = Java.use('okio.ByteString');
                return ByteString.decodeHex('0000000000000000000000000000000000000000000000000000000000000000');
            };
        } catch(e) {}
        
        // More aggressive approach - completely suppress the certificate pinning exception
        try {
            var RealInterceptorChain = Java.use('okhttp3.internal.http.RealInterceptorChain');
            RealInterceptorChain.proceed.overload('okhttp3.Request').implementation = function(request) {
                try {
                    return this.proceed(request);
                } catch (e) {
                    if (e.toString().includes('Certificate pinning failure')) {
                        send('[SSL Pinning Bypass] Certificate pinning failure suppressed for: ' + request.url());
                        // Return the original method call but without pinning
                        var originalPinner = this.call().client().certificatePinner();
                        try {
                            // Temporarily replace with empty pinner
                            var clientField = this.call().getClass().getDeclaredField('client');
                            clientField.setAccessible(true);
                            var client = clientField.get(this.call());
                            
                            var pinnerField = client.getClass().getDeclaredField('certificatePinner');
                            pinnerField.setAccessible(true);
                            pinnerField.set(client, EmptyCertificatePinner);
                            
                            var result = this.proceed(request);
                            
                            // Restore original pinner
                            pinnerField.set(client, originalPinner);
                            return result;
                        } catch (reflectionError) {
                            send('[SSL Pinning Bypass] Reflection bypass failed: ' + reflectionError);
                            throw e;
                        }
                    }
                    throw e;
                }
            };
        } catch(interceptorErr) {}
        
    } catch(err) {
        send('[SSL Pinning Bypass] Comprehensive okhttp3 bypass not available');
    }
    
    // Direct bypass for SSLPeerUnverifiedException 
    try {
        var SSLPeerUnverifiedException = Java.use('javax.net.ssl.SSLPeerUnverifiedException');
        SSLPeerUnverifiedException.$init.overload('java.lang.String').implementation = function(message) {
            if (message && message.includes('Certificate pinning failure')) {
                send('[SSL Pinning Bypass] SSLPeerUnverifiedException with certificate pinning blocked');
                // Don't throw the exception, just return
                return;
            }
            return this.$init(message);
        };
    } catch(err) {
        send('[SSL Pinning Bypass] SSLPeerUnverifiedException bypass not available');
    }
    
    // Additional OkHttp3 bypasses for interceptors and connection specs
    try {
        // Bypass ConnectionSpec TLS versions
        var ConnectionSpec = Java.use('okhttp3.ConnectionSpec');
        ConnectionSpec.isCompatible.implementation = function(sslSocket) {
            send('[SSL Pinning Bypass] okhttp3.ConnectionSpec.isCompatible() bypassed');
            return true;
        };
    } catch(err) {
        send('[SSL Pinning Bypass] okhttp3 ConnectionSpec not found');
    }
    
    // Note: RealConnection.connectTls bypass removed to prevent app crashes
    try {
        // https://gist.github.com/cubehouse/56797147b5cb22768b500f25d3888a22
        var dataTheorem = Java.use('com.datatheorem.android.trustkit.pinning.OkHostnameVerifier');
        dataTheorem.verify.overload('java.lang.String', 'javax.net.ssl.SSLSession').implementation = function (str) {
            send('[SSL Pinning Bypass] DataTheorem trustkit.pinning.OkHostnameVerifier.verify() 1 bypassed for ' + str);
            return true;
        };

        dataTheorem.verify.overload('java.lang.String', 'java.security.cert.X509Certificate').implementation = function (str) {
            send('[SSL Pinning Bypass] DataTheorem trustkit.pinning.OkHostnameVerifier.verify() 2 bypassed for ' + str);
            return true;
        };
    } catch(err) {
        send('[SSL Pinning Bypass] DataTheorem trustkit not found');
    }
    try {
        var PinningTrustManager = Java.use('appcelerator.https.PinningTrustManager');
        PinningTrustManager.checkServerTrusted.implementation = function () {
            send('[SSL Pinning Bypass] Appcelerator appcelerator.https.PinningTrustManager.checkServerTrusted() bypassed');
        }
    } catch (err) {
       send('[SSL Pinning Bypass] Appcelerator PinningTrustManager not found');
    }
    try {
        var SSLCertificateChecker = Java.use('nl.xservices.plugins.SSLCertificateChecker');
        SSLCertificateChecker.execute.overload('java.lang.String', 'org.json.JSONArray', 'org.apache.cordova.CallbackContext').implementation = function (action, args, callbackContext) {
            send('[SSL Pinning Bypass] Apache Cordova - SSLCertificateChecker.execute() bypassed');
            callbackContext.success('CONNECTION_SECURE');
            return;
        };
    } catch(err) {
        send('[SSL Pinning Bypass] Apache Cordova SSLCertificateChecker not found');
    }
    try {
        var wultra = Java.use('com.wultra.android.sslpinning.CertStore');
        wultra.validateFingerprint.overload('java.lang.String', '[B').implementation = function (commonName, fingerprint) {
            send('[SSL Pinning Bypass] Wultra com.wultra.android.sslpinning.CertStore.validateFingerprint() bypassed');
            var ValidationResult = Java.use('com.wultra.android.sslpinning.ValidationResult');
            return ValidationResult.TRUSTED;
        };
    } catch(err) {
        send('[SSL Pinning Bypass] Wultra CertStore.validateFingerprint not found');
    }

    /* Based on https://blog.csdn.net/ALakers/article/details/107642166
    WebView SSL Error Bypass */
    try {
        var WebViewClient = Java.use('android.webkit.WebViewClient');
        WebViewClient.onReceivedSslError.implementation = function(webView, sslErrorHandler, sslError) {
            send('WebViewClient onReceivedSslError bypassed');
            sslErrorHandler.proceed();
            return;
        };
        WebViewClient.onReceivedError.overload('android.webkit.WebView', 'int', 'java.lang.String', 'java.lang.String').implementation = function(a, b, c, d) {
            send('WebViewClient onReceivedError bypassed');
            return;
        };
        WebViewClient.onReceivedError.overload('android.webkit.WebView', 'android.webkit.WebResourceRequest', 'android.webkit.WebResourceError').implementation = function() {
            send('WebViewClient onReceivedError bypassed');
            return;
        };
    } catch(err) {
        send('[SSL Pinning Bypass] WebViewClient not found');
    }
    /*** HttpsURLConnection ***/
    try {
        var HttpsURLConnection = Java.use('javax.net.ssl.HttpsURLConnection');
        /*
        HttpsURLConnection.setDefaultHostnameVerifier.implementation = function(hostnameVerifier) {
            send('[SSL Pinning Bypass] HttpsURLConnection.setDefaultHostnameVerifier bypassed');
            return null;
        };*/
        HttpsURLConnection.setSSLSocketFactory.implementation = function(SSLSocketFactory) {
            send('[SSL Pinning Bypass] HttpsURLConnection.setSSLSocketFactory bypassed');
            return null;
        };
        HttpsURLConnection.setHostnameVerifier.implementation = function(hostnameVerifier) {
            send('[SSL Pinning Bypass] HttpsURLConnection.setHostnameVerifier bypassed');
            return null;
        };
    } catch(err) {
        send('[SSL Pinning Bypass] HttpsURLConnection not found');
    }
    try {
        /* SSLContext */
        var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
        var HostnameVerifier = Java.use('javax.net.ssl.HostnameVerifier');
        var SSLContext = Java.use('javax.net.ssl.SSLContext');
        var TrustManager;
        try {
            TrustManager = Java.registerClass({
                name: 'fake.TrustManager',
                implements: [X509TrustManager],
                methods: {
                    checkClientTrusted: function(chain, authType) {},
                    checkServerTrusted: function(chain, authType) {},
                    getAcceptedIssuers: function() {
                        return [];
                    }
                }
            });
        } catch (e) {
        }

        var EmptySSLFactory;
        try {
            var TrustManagers = [TrustManager.$new()];
            var TLS_SSLContext = SSLContext.getInstance('TLS');
            TLS_SSLContext.init(null, TrustManagers, null);
            EmptySSLFactory = TLS_SSLContext.getSocketFactory();

            var SSLContext_init = SSLContext.init.overload('[Ljavax.net.ssl.KeyManager;', '[Ljavax.net.ssl.TrustManager;', 'java.security.SecureRandom');
            SSLContext_init.implementation = function(keyManager, trustManager, secureRandom) {
                SSLContext_init.call(this, null, TrustManagers, null);
                // send('[SSL Pinning Bypass] SSLContext.init() bypass');
            };
        } catch (e) {
            send('[SSL Pinning Bypass] SSLContext.init() not found');
        }
        /* Xutils */
        var TrustHostnameVerifier;
        try {
            TrustHostnameVerifier = Java.registerClass({
                name: 'fake.TrustHostnameVerifier',
                implements: [HostnameVerifier],
                method: {
                    verify: function(hostname, session) {
                        return true;
                    }
                }
            });
        } catch (e) {
        }
        var RequestParams = Java.use('org.xutils.http.RequestParams');
        RequestParams.setSslSocketFactory.implementation = function(sslSocketFactory) {
            sslSocketFactory = EmptySSLFactory;
            return null;
        }
        RequestParams.setHostnameVerifier.implementation = function(hostnameVerifier) {
            hostnameVerifier = TrustHostnameVerifier.$new();
            return null;
        }
    } catch (e) {
        send('[SSL Pinning Bypass] Xutils not found');
    }
    /* httpclientandroidlib */
    try {
        var AbstractVerifier = Java.use('ch.boye.httpclientandroidlib.conn.ssl.AbstractVerifier');
        AbstractVerifier.verify.overload('java.lang.String', '[Ljava.lang.String', '[Ljava.lang.String', 'boolean').implementation = function() {
            send('[SSL Pinning Bypass] httpclientandroidlib AbstractVerifier bypassed');
            return null;
        }
    } catch (e) {
        send('[SSL Pinning Bypass] httpclientandroidlib not found');
    }
    /* cronet */
    try {
        var netBuilder = Java.use('org.chromium.net.CronetEngine$Builder');
        netBuilder.enablePublicKeyPinningBypassForLocalTrustAnchors.implementation = function(arg) {
            var ret = netBuilder.enablePublicKeyPinningBypassForLocalTrustAnchors.call(this, true);
            return ret;
        };
        netBuilder.addPublicKeyPins.implementation = function(hostName, pinsSha256, includeSubdomains, expirationDate) {
            return this;
        };
        send('[SSL Pinning Bypass] Cronet Public Key pinning bypassed');
    } catch (err) {
        send('[SSL Pinning Bypass] Cronet not found');
    }
    /* Boye AbstractVerifier */
    try {
        Java.use("ch.boye.httpclientandroidlib.conn.ssl.AbstractVerifier").verify.implementation = function(host, ssl) {
        send("[SSL Pinning Bypass] Bypassing Boye AbstractVerifier" + host);
    };
    } catch (err) {
        send("[SSL Pinning Bypass] Boye AbstractVerifier not found");
    }
    /* Appmattus */
    try {
        /* Certificate Transparency Bypass Ajin Abraham - opensecurity.in */
        Java.use('com.babylon.certificatetransparency.CTInterceptorBuilder').includeHost.overload('java.lang.String').implementation = function(host) {
            send('[SSL Pinning Bypass] Bypassing Certificate Transparency check');
            return this.includeHost('nonexistent.domain');
        };
    } catch (err) {
        send('[SSL Pinning Bypass] babylon certificatetransparency.CTInterceptorBuilder not found');
    }
    try {
        Java.use("com.appmattus.certificatetransparency.internal.verifier.CertificateTransparencyInterceptor")["intercept"].implementation = function(a) {
            send("[SSL Pinning Bypass] Appmattus Certificate Transparency");
            return a.proceed(a.request());
        };
    } catch (err) {
        send("[SSL Pinning Bypass] Appmattus CertificateTransparencyInterceptor not found");
    }
    try{
        bypassCertificateTransparency();
    } catch (err) {
        send('[SSL Pinning Bypass] certificatetransparency.CTInterceptorBuilder not found');
    }
    

}, 0);


function bypassCertificateTransparency() {
  // https://gist.github.com/m-rey/f2a235123908ca42395b6d3c5fe1128e
    try {
        var CertificateTransparencyInterceptor = Java.use('com.appmattus.certificatetransparency.internal.verifier.CertificateTransparencyInterceptor');

        CertificateTransparencyInterceptor.intercept.implementation = function (chain) {
            var request = chain.request();
            var url = request.url();
            var host = url.host();

            // Dynamically access the VerificationResult classes
            var VerificationResult = Java.use('com.appmattus.certificatetransparency.VerificationResult');
            var VerificationResultSuccessInsecureConnection = Java.use('com.appmattus.certificatetransparency.VerificationResult$Success$InsecureConnection');
            var VerificationResultFailureNoCertificates = Java.use('com.appmattus.certificatetransparency.VerificationResult$Failure$NoCertificates');

            // Create instances of the desired VerificationResult classes
            var success = VerificationResultSuccessInsecureConnection.$new(host);
            var failureNoCertificates = VerificationResultFailureNoCertificates.$new();

            // Bypass certificate transparency verification
            var certs = chain.connection().handshake().peerCertificates();
            if (certs.length === 0) {
            send('[SSL Pinning Bypass] Certificate transparency bypassed.');
            return failureNoCertificates;
            }

            try {
            // Proceed with the original request
            return chain.proceed(request);
            } catch (e) {
            // Catch SSLPeerUnverifiedException and return intercepted response
            if (e.toString().includes('SSLPeerUnverifiedException')) {
                send('[SSL Pinning Bypass] Certificate transparency failed.');
                return failureNoCertificates;
            }
            throw e;
            }
        };
    } catch (err) {
        send('[SSL Pinning Bypass] CertificateTransparencyInterceptor not found');
    }
}