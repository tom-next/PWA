const app = {
  isLoading: true,
  visibleCards: {},
  selectedCities: [],
  spinner: document.querySelector('.loader'),
  cardTemplate: document.querySelector('.cardTemplate'),
  container: document.querySelector('.main'),
  addDialog: document.querySelector('.dialog-container'),
  daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
};

var initialWeatherForecast = {
  key: '2459115',
  label: 'New York, NY',
  created: '2016-07-22T01:00:00Z',
  channel: {
    astronomy: {
      sunrise: "5:43 am",
      sunset: "8:21 pm"
    },
    item: {
      condition: {
        text: "Windy",
        date: "Thu, 21 Jul 2016 09:00 PM EDT",
        temp: 56,
        code: 24
      },
      forecast: [
        {code: 44, high: 86, low: 70},
        {code: 44, high: 94, low: 73},
        {code: 4, high: 95, low: 78},
        {code: 24, high: 75, low: 89},
        {code: 24, high: 89, low: 77},
        {code: 44, high: 92, low: 79},
        {code: 44, high: 89, low: 77}
      ]
    },
    atmosphere: {
      humidity: 56
    },
    wind: {
      speed: 25,
      direction: 195
    }
  }
};

// Toggles the visibility of the add new city dialog.
app.toggleAddDialog = function(visible) {
  if (visible) {
    app.addDialog.classList.add('dialog-container--visible');
  } else {
    app.addDialog.classList.remove('dialog-container--visible');
  }
};

app.updateForecastCard = function(data) {
  var dataLastUpdated = new Date(data.created);
  var sunrise = data.channel.astronomy.sunrise;
  var sunset = data.channel.astronomy.sunset;
  var current = data.channel.item.condition;
  var humidity = data.channel.atmosphere.humidity;
  var wind = data.channel.wind;

  var card = app.visibleCards[data.key];
  if (!card) {
    card = app.cardTemplate.cloneNode(true);
    card.classList.remove('cardTemplate');
    card.querySelector('.location').textContent = data.label;
    card.removeAttribute('hidden');
    app.container.appendChild(card);
    app.visibleCards[data.key] = card;
  }

  // Verifies the data provide is newer than what's already visible
  // on the card, if it's not bail, if it is, continue and update the
  // time saved in the card
  var cardLastUpdatedElem = card.querySelector('.card-last-updated');
  var cardLastUpdated = cardLastUpdatedElem.textContent;
  if (cardLastUpdated) {
    cardLastUpdated = new Date(cardLastUpdated);
    // Bail if the card has more recent data then the data
    if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
      return;
    }
  }
  cardLastUpdatedElem.textContent = data.created;

  card.querySelector('.description').textContent = current.text;
  card.querySelector('.date').textContent = current.date;
  card.querySelector('.current .icon').classList.add(app.getIconClass(current.code));
  card.querySelector('.current .temperature .value').textContent =
    Math.round(current.temp);
  card.querySelector('.current .sunrise').textContent = sunrise;
  card.querySelector('.current .sunset').textContent = sunset;
  card.querySelector('.current .humidity').textContent =
    Math.round(humidity) + '%';
  card.querySelector('.current .wind .value').textContent =
    Math.round(wind.speed);
  card.querySelector('.current .wind .direction').textContent = wind.direction;
  var nextDays = card.querySelectorAll('.future .oneday');
  var today = new Date();
  today = today.getDay();
  for (var i = 0; i < 7; i++) {
    var nextDay = nextDays[i];
    var daily = data.channel.item.forecast[i];
    if (daily && nextDay) {
      nextDay.querySelector('.date').textContent =
        app.daysOfWeek[(i + today) % 7];
      nextDay.querySelector('.icon').classList.add(app.getIconClass(daily.code));
      nextDay.querySelector('.temp-high .value').textContent =
        Math.round(daily.high);
      nextDay.querySelector('.temp-low .value').textContent =
        Math.round(daily.low);
    }
  }
  if (app.isLoading) {
    app.spinner.setAttribute('hidden', true);
    app.container.removeAttribute('hidden');
    app.isLoading = false;
  }
};

/*
    处理 model
*/
app.getForecast = function(key, label) {
  var statement = 'select * from weather.forecast where woeid=' + key;
  var url = 'https://query.yahooapis.com/v1/public/yql?format=json&q=' +
      statement;
  // TODO add cache logic here

  // Fetch the latest data.
  var request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    if (request.readyState === XMLHttpRequest.DONE) {
      if (request.status === 200) {
        var response = JSON.parse(request.response);
        var results = response.query.results;
        results.key = key;
        results.label = label;
        results.created = response.query.created;
        app.updateForecastCard(results);
      }
    } else {
      // Return the initial weather forecast since no data is available.
      app.updateForecastCard(initialWeatherForecast);
    }
  };
  request.open('GET', url);
  request.send();
};

app.updateForecasts = function() {
  var keys = Object.keys(app.visibleCards);
  keys.forEach(function(key) {
    app.getForecast(key);
  });
};

app.saveSelectedCities = function() {
    var selectedCities = JSON.stringify(app.selectedCities);
    localStorage.selectedCities = selectedCities;
  };

app.getIconClass = function(weatherCode) {
  // Weather codes: https://developer.yahoo.com/weather/documentation.html#codes
  weatherCode = parseInt(weatherCode);
  switch (weatherCode) {
    case 25: // cold
    case 32: // sunny
    case 33: // fair (night)
    case 34: // fair (day)
    case 36: // hot
    case 3200: // not available
      return 'clear-day';
    case 0: // tornado
    case 1: // tropical storm
    case 2: // hurricane
    case 6: // mixed rain and sleet
    case 8: // freezing drizzle
    case 9: // drizzle
    case 10: // freezing rain
    case 11: // showers
    case 12: // showers
    case 17: // hail
    case 35: // mixed rain and hail
    case 40: // scattered showers
      return 'rain';
    case 3: // severe thunderstorms
    case 4: // thunderstorms
    case 37: // isolated thunderstorms
    case 38: // scattered thunderstorms
    case 39: // scattered thunderstorms (not a typo)
    case 45: // thundershowers
    case 47: // isolated thundershowers
      return 'thunderstorms';
    case 5: // mixed rain and snow
    case 7: // mixed snow and sleet
    case 13: // snow flurries
    case 14: // light snow showers
    case 16: // snow
    case 18: // sleet
    case 41: // heavy snow
    case 42: // scattered snow showers
    case 43: // heavy snow
    case 46: // snow showers
      return 'snow';
    case 15: // blowing snow
    case 19: // dust
    case 20: // foggy
    case 21: // haze
    case 22: // smoky
      return 'fog';
    case 24: // windy
    case 23: // blustery
      return 'windy';
    case 26: // cloudy
    case 27: // mostly cloudy (night)
    case 28: // mostly cloudy (day)
    case 31: // clear (night)
      return 'cloudy';
    case 29: // partly cloudy (night)
    case 30: // partly cloudy (day)
    case 44: // partly cloudy
      return 'partly-cloudy-day';
  }
};

var bindButtonRefresh = function() {
    var button = document.getElementById('butRefresh')
    button.addEventListener('click', function() {
      // Refresh all of the forecasts
      app.updateForecasts();
    });
}

var bindButtonAdd = function() {
    var button = document.getElementById('butAdd')
    button.addEventListener('click', function() {
      // Open/show the add new city dialog
      app.toggleAddDialog(true);
    });
}

var bindAddCity = function() {
    var button = document.getElementById('butAddCity')
    button.addEventListener('click', function() {
      // Add the newly selected city
      var select = document.getElementById('selectCityToAdd');
      var selected = select.options[select.selectedIndex];
      var key = selected.value;
      var label = selected.textContent;
      // TODO init the app.selectedCities array here
      if (!app.selectedCities) {
         app.selectedCities = [];
      }
      app.getForecast(key, label);
      // TODO push the selected city to the array and save here
      app.selectedCities.push({key: key, label: label});
      app.saveSelectedCities();
      app.toggleAddDialog(false);
    });
}

var bindAddCancel = function() {
    var button = document.getElementById('butAddCancel')
    button.addEventListener('click', function() {
      // Close the add new city dialog
      app.toggleAddDialog(false);
    });
}

var bindEvents = function() {
    bindButtonRefresh()
    bindButtonAdd()
    bindAddCity()
    bindAddCancel()
}

var bindServiceWork = function() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('./service-worker.js').then(function() {
                     console.log('Service Worker Registered');
                 });
        })
    }else {
        window.console.log("不存在")
    }
}

var initialApp = function() {
    app.updateForecastCard(initialWeatherForecast)
    app.selectedCities = localStorage.selectedCities
    if (app.selectedCities) {
        app.selectedCities = JSON.parse(app.selectedCities)
        app.selectedCities.forEach(function(city) {
          app.getForecast(city.key, city.label)
      })
    } else {
      app.updateForecastCard(initialWeatherForecast)
      app.selectedCities = [
        {key: initialWeatherForecast.key, label: initialWeatherForecast.label}
      ]
      app.saveSelectedCities()
    }
}


var main = function() {
    bindEvents()
    bindServiceWork()
    initialApp()
}

main()
