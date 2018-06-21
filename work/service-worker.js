var cacheName = 'weatherPWA-step-6-1';
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

var bindInstall = function() {
    self.addEventListener('install', function(e) {
        console.log('[ServiceWorker] Install')
        e.waitUntil(
          caches.open(cacheName).then(function(cache) {
            console.log('[ServiceWorker] Caching app shell')
            return cache.addAll(filesToCache)
          })
        )
    })
}

var bindActive = function() {
    // caches 更新与否 是根据caches的keys来决定,
    // 项目内容发生变化, 同样这个cache key 也需要改变
    self.addEventListener('activate', function(e) {
        console.log('[ServiceWorker] Activate')
        let option = caches.keys().then(
            function(keyList) {
                let list = keyList.map(function(key) {
                  if (key !== cacheName) {
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

var bindFetch = function() {
    // 拦截请求，判断是否用缓存还是去请求网路服务资源
    // cash: 是一个CacheStorage对象
    self.addEventListener('fetch', function(e) {
        console.log('[ServiceWorker] Fetch', e.request.url)
        // e.responseWith 相当于我们正常的访问接口返回，通过 caches.match 来匹配到缓存中有没有这个请求
        // 有的话直接从缓存中去取，没有调用网络资源，caches.match()可以用来匹配 你的请求
        let res = caches.match(e.request).then(
            function(response) {
                return response || fetch(e.request)
        })
        e.respondWith(res)
    })
}

var main = function() {
    bindInstall()
    bindActive()
    bindFetch()
}

main()
