
/*
The general software architecture pattern used here is known as Model-View-Controller (aka MVC).
reference: https://www.youtube.com/watch?v=fa8eUcu30Lw
Each individual component (Model, View or Controller)
is designed using the Revealing Module Pattern.
reference: https://www.youtube.com/watch?v=pOfwp6VlnlM
*/

/* ************************************************************************
CONTROLLER
************************************************************************* */
(function makeController(
  clocksModel,
  clocksView,
  greetingModel,
  greetingView,
  newsfeedModel,
  newsfeedView,
  toolboxView,
  htmlModel,
  htmlView,
  cssModel,
  cssView,
  pagespeedModel,
  pagespeedView,
  colorpickerModel,
  colorpickerView,
  backgroundModel,
  backgroundView,
) {
/* ***** POMODORO SECTION ******** */

  function togglePomodoroActive() {
    clocksModel.toggleActive();
    clocksView.toggleActive(clocksModel.getStatus().isActive);
    clocksView.togglePause(clocksModel.getStatus().isPaused);
    clocksView.toggleWorkBreak(clocksModel.getStatus().isOnBreak);
  }

  function togglePomodoroPause() {
    clocksModel.togglePause();
    clocksView.togglePause(clocksModel.getStatus().isPaused);
  }

  function toggleWorkBreak() {
    clocksModel.toggleWorkBreak();
    clocksView.toggleWorkBreak(clocksModel.getStatus().isOnBreak);
    clocksView.togglePause(clocksModel.getStatus().isPaused);
  }

  function resetPomodoro() {
    clocksModel.resetClock();
    clocksView.togglePause(clocksModel.getStatus().isPaused);
  }

  // continuous loop that updates clock display. reference https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
  function clocksHandler() {
    if (!clocksModel.getStatus().isActive) {
      clocksView.updateTime(clocksModel.getTime());
    } else if (clocksModel.getStatus().isActive) {
      const countdown = clocksModel.cycle();
      const task = clocksModel.getStatus().isOnBreak ? 'break' : 'work';

      if (countdown == '0:00') {
        clocksModel.triggerSound(clocksModel.alarm);
        toggleWorkBreak();
      }
      clocksView.updateCountdown(countdown, task);
    }
    requestAnimationFrame(clocksHandler);
  }

  // basic web audio API audio loading function. reference: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
  // free sound effects from soundbible.com

  function loadSounds() {
    fetch('./assets/audio/alarm.mp3')
      .then(response => response.arrayBuffer())
      .then((buffer) => {
        clocksModel.audio.decodeAudioData(buffer, (decodedData) => {
          clocksModel.alarm = decodedData;
        });
      });
  }

  /* ***** USER GREETING SECTION ******** */

  function setUserName(e) {
    e.preventDefault();
    greetingModel.setUserName($('#name-input').val());
    greetingView.showGreeting(greetingModel.getUserName());
  }

  function toggleNameInput() {
    return greetingView.toggleNameInput(greetingModel.getUserName());
  }

  /* ******** NEWSFEED SECTION ******* */

  function loadNewsArticles() {
    newsfeedModel.sources.forEach((source) => {
      fetch(`https://newsapi.org/v1/articles?source=${source}&sortBy=top&apiKey=${newsfeedModel.APIKey}`)
        .then(response => response.json())
        .then((data) => {
          const content = data.articles.map((article) => {
            return newsfeedView.generateArticle(
              data.source,
              article.url,
              article.urlToImage,
              article.title,
              article.author,
            );
          });
          newsfeedView.append(`${content.filter((item, index) => index < 3).join('\r\n')}`);
        });
    });
  }

  /* ********* VALIDATOR SECTION ********** */

  function htmlValidatorCall(e) {
    e.preventDefault();

    const newdata = new FormData(this);

    $.ajax({
      url: 'https://validator.w3.org/nu/',
      data: newdata,
      method: 'POST',
      processData: false,
      contentType: false,
      success: (content) => {
        htmlView.successOutput(htmlModel.format(content, { type: 'error' }));
      },
      error: () => {
        htmlView.errorOutput();
      },
    });
  }

  function CSSValidatorCall(e) {
    e.preventDefault();

    // const content = $('#css-markup textarea').val().replace(/\n/ig, '%0A');
    const content = $('#css-markup textarea').val();
    const proxyURL = 'https://cors-anywhere.herokuapp.com/';
    const validatorURL = `http://jigsaw.w3.org/css-validator/validator?text=${content}&profile=css3&output=json`;

    fetch(proxyURL + validatorURL)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        cssView.errorOutput();
        throw new Error('Network response was not ok.');
      })
      .then(results => cssView.successOutput(results.cssvalidation.errors, cssModel.format));
  }

  /* ********* PAGE SPEED SECTION ********** */

  function loadPageSpeedChecker() {
    function verifySpeedResults(result) {
      // JSONP callback. Checks for errors, then invokes callback handlers
      if (result.error) {
        const errors = result.error.errors;
        for (var i = 0, len = errors.length; i < len; ++i) {
          if (errors[i].reason === 'badRequest' && pagespeedModel.API_KEY === 'yourAPIKey') {
            // console.log('Please specify your Google API key in the API_KEY variable.');
            $('#speed-page-error').append('Please specify your Google API key in the API_KEY variable.');
          } else {
            // console.log(errors[i].message);
            $('#speed-page-error').append(`${errors[i].message}`);
          }
        }
        $('#loader-icon').removeClass('spin').hide();
        $('#analyzePage').removeAttr('disabled', 'disabled');
        $('.toggle-custom-view').removeAttr('disabled', 'disabled');
        return;
      }
      pagespeedView.displayPageSpeedScore(result);
    }

    // Invokes the PageSpeed Insights API. The response will contain
    // JavaScript that invokes our callback with the PageSpeed results
    function runPagespeed() {
      let urlStrategy = '';

      if ($('.toggle-custom-view:checked').val() === 'mobile') {
        urlStrategy = `${pagespeedModel.API_URL}&key=${pagespeedModel.API_KEY}&strategy=mobile&url=${$('#path').val()}`;
      } else { urlStrategy = `${pagespeedModel.API_URL}&key=${pagespeedModel.API_KEY}&strategy=desktop&url=${$('#path').val()}`; }

      $.ajax({
        url: urlStrategy,
        dataType: 'JSONP',
        async: false,
        processData: false,
        contentType: false,
        success: (result) => {
          verifySpeedResults(result);
        },
      });
    }

    // Desktop & Mobile Score trigger from URL provided
    $('#analyzePage').on('click', () => {
      $('#speed-page-error').empty(); // Clear previous results
      $('.returnresults').slideUp(500);
      $('.page-speed-box').slideUp(500).empty();
      $('#analyzePage').addClass('active').attr('disabled', 'disabled'); // Cannot click again until fully loaded
      $('.toggle-custom-view').attr('disabled', 'disabled'); // Cannot switch between desktop and mobile until fully loaded
      $('#loader-icon').show().addClass('spin'); // Loading icon to indicate user to be patient
      runPagespeed();
    });
  }

  /* ********* COLOR PICKER SECTION ********** */

  function loadColorPicker() {
    colorpickerView.createShadeSpectrum();
    colorpickerView.createHueSpectrum();

    function endGetSpectrumColor() {
      colorpickerModel.spectrumCursor.classList.remove('dragging');
      window.removeEventListener('mousemove', colorpickerModel.getSpectrumColor);
    }

    const startGetSpectrumColor = (e) => {
      colorpickerModel.getSpectrumColor(e);
      colorpickerModel.spectrumCursor.classList.add('dragging');
      window.addEventListener('mousemove', colorpickerModel.getSpectrumColor);
      window.addEventListener('mouseup', endGetSpectrumColor);
    };

    colorpickerModel.spectrumCanvas.addEventListener('mousedown', (e) => {
      startGetSpectrumColor(e);
    });

    function getHueColor(e) {
      e.preventDefault();
      let y = e.pageY - colorpickerModel.hueRect.top;
      if (y > colorpickerModel.hueRect.height) { y = colorpickerModel.hueRect.height; }
      if (y < 0) { y = 0; }
      const percent = y / colorpickerModel.hueRect.height;
      colorpickerModel.hue = 360 - (360 * percent);
      const hueColor = tinycolor('hsl '+ colorpickerModel.hue + ' 1 .5').toHslString();
      const color = tinycolor('hsl '+ colorpickerModel.hue + ' ' + colorpickerModel.saturation + ' ' + colorpickerModel.lightness).toHslString();
      colorpickerView.createShadeSpectrum(hueColor);
      colorpickerModel.updateHueCursor(y, hueColor);
      colorpickerModel.setCurrentColor(color);
      colorpickerModel.setColorValues(color);
    }

    function endGetHueColor() {
      colorpickerModel.hueCursor.classList.remove('dragging');
      window.removeEventListener('mousemove', getHueColor);
    }

    function startGetHueColor(e) {
      getHueColor(e);
      colorpickerModel.hueCursor.classList.add('dragging');
      window.addEventListener('mousemove', getHueColor);
      window.addEventListener('mouseup', endGetHueColor);
    }

    colorpickerModel.hueCanvas.addEventListener('mousedown', (e) => {
      startGetHueColor(e);
    });

    function colorToPos(color) {
      var color = tinycolor(color);
      const hsl = color.toHsl();
      colorpickerModel.hue = hsl.h;
      const hsv = color.toHsv();
      const x = colorpickerModel.spectrumRect.width * hsv.s;
      const y = colorpickerModel.spectrumRect.height * (1 - hsv.v);
      const hueY = colorpickerModel.hueRect.height - ((colorpickerModel.hue / 360) * colorpickerModel.hueRect.height);
      colorpickerModel.updateSpectrumCursor(x, y);
      colorpickerModel.updateHueCursor(hueY);
      colorpickerModel.setCurrentColor(color);
      colorpickerModel.setColorValues(color);
      colorpickerView.createShadeSpectrum(colorpickerModel.colorToHue(color));
    }

    // Add event listeners
    colorpickerModel.red.addEventListener('change', () => {
      const color = tinycolor(`rgb ${colorpickerModel.red.value} ${colorpickerModel.green.value} ${colorpickerModel.blue.value}`);
      colorToPos(color);
    });

    colorpickerModel.green.addEventListener('change', () => {
      const color = tinycolor(`rgb ${colorpickerModel.red.value} ${colorpickerModel.green.value} ${colorpickerModel.blue.value}`);
      colorToPos(color);
    });

    colorpickerModel.blue.addEventListener('change', () => {
      const color = tinycolor(`rgb ${colorpickerModel.red.value} ${colorpickerModel.green.value} ${colorpickerModel.blue.value}`);
      colorToPos(color);
    });

    colorpickerModel.hex.addEventListener('change', () => {
      const color = tinycolor(`#${colorpickerModel.hex.value}`);
      colorToPos(color);
    });

    colorpickerModel.huedisplay.addEventListener('change', () => {
      const color = tinycolor(`hsl ${colorpickerModel.huedisplay.value} ${colorpickerModel.saturationdisplay.value} ${colorpickerModel.lightnessdisplay.value}`);
      colorToPos(color);
    });

    colorpickerModel.saturationdisplay.addEventListener('change', () => {
      const color = tinycolor(`hsl ${colorpickerModel.huedisplay.value} ${colorpickerModel.saturationdisplay.value} ${colorpickerModel.lightnessdisplay.value}`);
      colorToPos(color);
    });

    colorpickerModel.lightnessdisplay.addEventListener('change', () => {
      const color = tinycolor(`hsl ${colorpickerModel.huedisplay.value} ${colorpickerModel.saturationdisplay.value} ${colorpickerModel.lightnessdisplay.value}`);
      colorToPos(color);
    });

    colorpickerModel.modeToggle.addEventListener('click', () => {
      if (colorpickerModel.hexField.classList.contains('active')) {
        colorpickerModel.hexField.classList.remove('active');
        colorpickerModel.rgbFields.classList.add('active');
      } else if (colorpickerModel.rgbFields.classList.contains('active')) {
        colorpickerModel.rgbFields.classList.remove('active');
        colorpickerModel.hslFields.classList.add('active');
      } else if (colorpickerModel.hslFields.classList.contains('active')) {
        colorpickerModel.hslFields.classList.remove('active');
        colorpickerModel.hexField.classList.add('active');
      }
    });
  }

  /* ********* BACKGROUND SECTION ************ */

  /*
   * Randomly selects background image and associated author and reference link for page
   * Background images change every time tab is opened or page is refreshed
   * Background images categorized into daytime (7AM-6:59PM) and nighttime (7PM-6:59AM)
   * Background image shown depends on user's local time (day/night)
   */

  function loadBackground() {
    if (backgroundModel.picTime > 6 && backgroundModel.picTime < 19) {
      backgroundView.generateDayBg();
    } else { backgroundView.generateNightBg(); }
  }

  /* ********* GENERAL ************ */

  function setupEventListeners() {
    $(window).on('click', toggleNameInput())
      .on('click', newsfeedView.toggleNewsfeed)
      .on('click', toolboxView.toggleToolbox)
      .on('click', colorpickerView.toggleColorPicker);
    $('#name-form').on('submit', setUserName);
    $('.start, .stop').on('click', togglePomodoroActive);
    $('.pause').on('click', togglePomodoroPause);
    $('.reset').on('click', resetPomodoro);
    $('.work-break').on('click', toggleWorkBreak);
    $('#html-markup').on('submit', htmlValidatorCall);
    $('#css-markup').on('submit', CSSValidatorCall);
  }

  function initialize() {
    $('.devtab-bg').hide();
    loadBackground();
    greetingView.showGreeting(greetingModel.getUserName());
    clocksView.updateTime(clocksModel.getTime());
    setupEventListeners();
    loadSounds();
    loadNewsArticles();
    clocksHandler();
    loadPageSpeedChecker();
    loadColorPicker();
    $('.tools-container').hide();
    $('.valid-container').hide();
    $('.page-speed-container').hide();
    $('.returnresults').hide();
    $('#loader-icon').hide();
    $('.color-picker-panel').hide();
  }

  window.app.controller = {
    initialize,
  };
}(
  window.app.clocksModel,
  window.app.clocksView,
  window.app.greetingModel,
  window.app.greetingView,
  window.app.newsfeedModel,
  window.app.newsfeedView,
  window.app.toolboxView,
  window.app.htmlModel,
  window.app.htmlView,
  window.app.cssModel,
  window.app.cssView,
  window.app.pagespeedModel,
  window.app.pagespeedView,
  window.app.colorpickerModel,
  window.app.colorpickerView,
  window.app.backgroundModel,
  window.app.backgroundView,
));

window.app.controller.initialize();
