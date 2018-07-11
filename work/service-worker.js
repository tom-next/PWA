var cacheName = 'weatherPWA-step-6-1';
var dataCacheName = 'weatherData-v1' 
// 服务工作线程中增加其目的地是为了将应用数据与APP Shell 分离。
// 更新 App Shell 并清除较旧缓存时，我们的数据将保持不变，可随时用于实现超快速加载。切记，如果未来您的数据格式发生变化，您需要相应的处理手段，并且需要确保 App Shell 和内容保持同步。

// 你想要缓存的资源
var filesToCache = [
    '/',
    '/index.html',
    '/scripts/app.js',
    '/styles/inline.css',
    '/images/clear.png',
    '/images/cloudy-scattered-showers.png',
    '/images/cloudy.png',
    '/images/fog.png',
    '/images/ic_add_white_24px.svg',
    '/images/ic_refresh_white_24px.svg',
    '/images/partly-cloudy.png',
    '/images/rain.png',
    '/images/scattered-showers.png',
    '/images/sleet.png',
    '/images/snow.png',
    '/images/thunderstorm.png',
    '/images/wind.png'
];

var bindInstall = function () {
    self.addEventListener('install', function (e) {
        console.log('[ServiceWorker] Install')
        e.waitUntil(
            caches.open(cacheName).then(function (cache) {
                console.log('[ServiceWorker] Caching app shell')
                return cache.addAll(filesToCache)
            })
        )
    })
}

var bindActive = function () {
    // caches 更新与否 是根据caches的keys来决定,
    // 项目内容发生变化, 同样这个cache key 也需要改变
    self.addEventListener('activate', function (e) {
        console.log('[ServiceWorker] Activate')
        let option = caches.keys().then(
            function (keyList) {
                let list = keyList.map(function (key) {
                    // 更新 active 使其不会在清除 APP Shell 缓存时删除数据缓存
                    if (key !== cacheName && key !== dataCacheName) {
                        console.log('[ServiceWorker] Removing old cache', key)
                        return caches.delete(key)
                    }
                })
                return Promise.all(list)
            }
        )
        e.waitUntil(option)
        return self.clients.claim()
    })
}


/*
使用服务工作线程缓存预报数据
为您的数据选择正确的缓存策略至关重要，这取决于您的应用所提供数据的类型。例如，天气或股票价格之类的高时效性数据应尽可能频繁地更新，而头像图像或文章内容的更新则不必那么频繁。
缓存优先于网络 策略是适合我们的应用的理想策略。它会尽快将数据显示在屏幕上，然后在网络返回最新数据时更新数据。与网络优先于缓存相比，用户不必等到抓取超时，就能获得缓存的数据。
缓存优先于网络意味着我们需要发起两个异步请求，一个发向缓存，一个发向网络。我们通过应用发出的网络请求不需要做多大的改动，但我们需要修改服务工作线程，以先缓存响应，然后再将其返回。
在正常情况下，将返回缓存的数据，这几乎立即能够为应用提供其可以使用的最新数据。然后，在网络请求返回时，将使用来自网络的最新数据更新应用。
*/
var bindFetch = function () {
    // 拦截请求，判断是否用缓存还是去请求网路服务资源
    // cash: 是一个CacheStorage对象
    self.addEventListener('fetch', function (e) {
        console.log('[ServiceWorker] Fetch', e.request.url)
        // e.responseWith 相当于我们正常的访问接口返回，通过 caches.match 来匹配到缓存中有没有这个请求
        // 有的话直接从缓存中去取，没有调用网络资源，caches.match()可以用来匹配 你的请求
        // let res = caches.match(e.request).then(
        //     function (response) {
        //         return response || fetch(e.request)
        //     })
        // e.respondWith(res)



        // update，更新缓存
        // 如果是以约定的 url 为开头，我们将使用抓取发出请求。返回请求后，我们的代码会打开缓存，克隆响应，将其存储在缓存内，最后将响应返回给原始请求者。
        var dataUrl = 'https://query.yahooapis.com/v1/public/yql'
        if (e.request.url.indexOf(dataUrl) > -1) {
            /*
             * When the request URL contains dataUrl, the app is asking for fresh
             * weather data. In this case, the service worker always goes to the
             * network and then caches the response. This is called the "Cache then
             * network" strategy:
             * https://jakearchibald.com/2014/offline-cookbook/#cache-then-network
             */
            e.respondWith(
                caches.open(dataCacheName).then(function (cache) {
                    return fetch(e.request).then(function (response) {
                        cache.put(e.request.url, response.clone());
                        return response;
                    });
                })
            );
        } else {
            /*
             * The app is asking for app shell files. In this scenario the app uses the
             * "Cache, falling back to the network" offline strategy:
             * https://jakearchibald.com/2014/offline-cookbook/#cache-falling-back-to-network
             */
            e.respondWith(
                caches.match(e.request).then(function (response) {
                    return response || fetch(e.request);
                })
            );
        }
    })
}

var main = function () {
    bindInstall()
    bindActive()
    bindFetch()
}

main()
