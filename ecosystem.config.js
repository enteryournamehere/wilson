module.exports = {
  apps : [{
    script: 'wilson.js',
    cwd: '/home/pi/nodejs/wilson',
    //watch: '.',
    env: {
      GOOGLE_APPLICATION_CREDENTIALS: "google_auth.json"
    }
  }]
};
