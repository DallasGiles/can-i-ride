const apiKey = '44b5e8ce8c234554ba8785bf5d72ea5c';
const geoApiKey = '5d84294763474e51b9cfc826bcf84321';
const cityList = document.getElementById('city-list');
const citySearchForm = document.getElementById('city-search-form');
const citySearchInput = document.getElementById('city-search-input');
const suggestionsElement = document.getElementById('city-suggestions');
const calendar = document.getElementById('calendar');
const modal = document.getElementById('settings-modal'); // Modal element
const openModalBtn = document.getElementById('open-settings'); // Button to open the modal
const closeModalBtn = document.getElementById('close-modal'); // Button to close the modal

// Utility: Generalized Fetch Function
const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  return await response.json();
};

// Preferences: Save to localStorage
const savePreferences = (preferences) => {
  localStorage.setItem('userPreferences', JSON.stringify(preferences));
};

// Preferences: Load from localStorage
const loadPreferences = () => {
  const savedPreferences = JSON.parse(localStorage.getItem('userPreferences'));
  return savedPreferences || { minTemp: 60, maxTemp: 90, maxHumidity: 70, maxCloudCoverage: 50 };
};

// Populate Settings Form with Preferences
const populateSettingsForm = () => {
  const { minTemp, maxTemp, maxHumidity, maxCloudCoverage } = loadPreferences();
  document.getElementById('minTemp').value = minTemp;
  document.getElementById('maxTemp').value = maxTemp;
  document.getElementById('maxHumidity').value = maxHumidity;
  document.getElementById('maxCloudCoverage').value = maxCloudCoverage;
};

// Get User Preferences from Form
const getUserPreferences = () => {
  const minTemp = parseFloat(document.getElementById('minTemp').value);
  const maxTemp = parseFloat(document.getElementById('maxTemp').value);
  const maxHumidity = parseFloat(document.getElementById('maxHumidity').value);
  const maxCloudCoverage = parseFloat(document.getElementById('maxCloudCoverage').value);
  return { minTemp, maxTemp, maxHumidity, maxCloudCoverage };
};
// Open the modal
openModalBtn.addEventListener('click', () => {
  modal.style.display = 'block';
  populateSettingsForm();
});

// Close the modal
closeModalBtn.addEventListener('click', () => {
  modal.style.display = 'none';
});

// Close the modal when clicking outside the modal content
window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

// Save Cities to localStorage
const saveCities = (cities) => {
  localStorage.setItem('savedCities', JSON.stringify(cities));
};

// Load Cities from localStorage
const getSavedCities = () => JSON.parse(localStorage.getItem('savedCities')) || [];

// Render City List in Sidebar
const renderCityList = () => {
  const cities = getSavedCities();
  cityList.innerHTML = '';
  cities.forEach((city) => {
    const li = document.createElement('li');
    li.textContent = city.name;
    li.addEventListener('click', () => {
      generateCalendar(city.name);
    });
    cityList.appendChild(li);
  });
};

// Fetch City Suggestions using OpenCage API
const fetchSuggestions = async (query) => {
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${geoApiKey}&limit=5`;
  const data = await fetchJson(url);
  return data?.results || [];
};

// Update Datalist with Suggestions
const updateSuggestions = async (query) => {
  suggestionsElement.innerHTML = ''; // Clear previous suggestions
  if (query.length < 3) return; // Avoid sending requests for short queries

  try {
    const suggestions = await fetchSuggestions(query);
    suggestions.forEach((result) => {
      const option = document.createElement('option');
      option.value = result.formatted; // Display the formatted address
      suggestionsElement.appendChild(option);
    });
  } catch {
    suggestionsElement.innerHTML = '';
  }
};

// Fetch Weather Data using Weatherbit API
const fetchWeatherData = async (cityName) => {
  const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(cityName)}&key=${geoApiKey}&limit=1`;
  const geocodeData = await fetchJson(geocodeUrl);
  if (!geocodeData.results || geocodeData.results.length === 0) {
    throw new Error('City not found');
  }
  const { lat, lng } = geocodeData.results[0].geometry;

  const weatherUrl = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${lat}&lon=${lng}&key=${apiKey}&units=I`;
  const weatherData = await fetchJson(weatherUrl);
  return weatherData?.data || [];
};

// Generate the Calendar for a Specific City
const generateCalendar = async (cityName) => {
  try {
    const weatherData = await fetchWeatherData(cityName);
    if (!weatherData) throw new Error('No weather data available');

    const { minTemp, maxTemp, maxHumidity, maxCloudCoverage } = loadPreferences();

    calendar.innerHTML = ''; // Clear previous calendar content
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const targetDate = date.toISOString().split('T')[0];
      const dayWeather = weatherData.find((entry) => entry.datetime === targetDate);

      const dayElement = document.createElement('div');
      if (!dayWeather) {
        dayElement.className = 'day gray';
        dayElement.textContent = `${date.toLocaleDateString()}\nNo data`;
      } else {
        const weather = dayWeather.weather.description || 'Unknown';
        const weatherIconUrl = `https://www.weatherbit.io/static/img/icons/${dayWeather.weather.icon}.png`;
        const highTemp = dayWeather.high_temp || 'N/A';
        const lowTemp = dayWeather.low_temp || 'N/A';
        const windSpeed = dayWeather.wind_spd || 'N/A';
        const humidity = dayWeather.rh || 'N/A';
        const cloudCoverage = dayWeather.clouds || 'N/A';
        const precipitation = dayWeather.precip || '0';

        // Evaluate conditions based on user preferences
        const isGoodDay =
          highTemp <= maxTemp &&
          lowTemp >= minTemp &&
          humidity <= maxHumidity &&
          cloudCoverage <= maxCloudCoverage;

        const isAcceptableDay =
          highTemp <= maxTemp + 5 &&
          lowTemp >= minTemp - 5 &&
          humidity <= maxHumidity + 10 &&
          cloudCoverage <= maxCloudCoverage + 20;

        if (isGoodDay) {
          dayElement.className = 'day green';
        } else if (isAcceptableDay) {
          dayElement.className = 'day yellow';
        } else {
          dayElement.className = 'day red';
        }

        dayElement.innerHTML = `
          <img src="${weatherIconUrl}" alt="${weather}" />
          <span>
            ${date.toLocaleDateString()}<br>
            ${weather}<br>
            High: ${highTemp}°F | Low: ${lowTemp}°F<br>
            Wind: ${windSpeed} m/s | Humidity: ${humidity}%<br>
            Cloud Coverage: ${cloudCoverage}% | Precipitation: ${precipitation} mm
          </span>
        `;
      }

      calendar.appendChild(dayElement);
    }
  } catch (error) {
    alert(error.message || 'Failed to generate calendar');
  }
};

// Handle City Search
citySearchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const cityName = citySearchInput.value.trim();
  if (!cityName) return;

  const cities = getSavedCities();
  cities.push({ name: cityName });
  saveCities(cities);
  renderCityList();
  await generateCalendar(cityName);
});

// Handle Settings Form Submission
document.getElementById('settings-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const preferences = getUserPreferences();
  savePreferences(preferences);
  alert('Preferences saved successfully!');
});

// Initialize the App
const initializeApp = async () => {
  populateSettingsForm(); // Populate settings form with saved preferences
  renderCityList(); // Render saved cities
  const cities = getSavedCities();
  if (cities.length > 0) {
    await generateCalendar(cities[0].name);
  } else {
    await generateCalendar('New York'); // Default city
  }
};

citySearchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  if (query) updateSuggestions(query);
});

initializeApp();