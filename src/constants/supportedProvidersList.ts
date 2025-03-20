const supportedProviders = [
    {
      name: "Whoop V2",
      slug: "whoop_v2",
      description: "Smart Activity Watches",
      logo: "https://storage.googleapis.com/vital-assets/whoop.png",
      authType: "team_oauth",
      supportedResources: ["activity", "sleep", "workouts"],
    },
    {
      name: "MyFitnessPal",
      slug: "my_fitness_pal_v2",
      description: "Weight loss and fitness application",
      logo: "https://storage.googleapis.com/vital-assets/my_fitness_pal.png",
      authType: "team_oauth",
      supportedResources: ["meal"],
    },
    {
      name: "Peloton",
      slug: "peloton",
      description: "Popular cycling equipment",
      logo: "https://storage.googleapis.com/vital-assets/peloton.png",
      authType: "password",
      supportedResources: ["workout_stream", "workouts"],
    },
    {
      name: "Oura",
      slug: "oura",
      description: "Smart sleep tracking ring",
      logo: "https://storage.googleapis.com/vital-assets/oura.png",
      authType: "oauth",
      supportedResources: [
        "activity",
        "body",
        "calories_active",
        "distance",
        "heartrate",
        "hrv",
        "hypnogram",
        "profile",
        "respiratory_rate",
        "sleep",
        "sleep_cycle",
        "sleep_stream",
        "steps",
        "weight",
        "workouts",
      ],
    },
    {
      name: "Garmin",
      slug: "garmin",
      description: "Fitness watches",
      logo: "https://storage.googleapis.com/vital-assets/garmin.png",
      authType: "oauth",
      supportedResources: [
        "activity",
        "blood_oxygen",
        "blood_pressure",
        "body",
        "calories_active",
        "distance",
        "fat",
        "heartrate",
        "hrv",
        "hypnogram",
        "respiratory_rate",
        "sleep",
        "sleep_cycle",
        "sleep_stream",
        "steps",
        "stress_level",
        "vo2_max",
        "weight",
        "workout_stream",
        "workouts",
      ],
    },
    {
      name: "Fitbit",
      slug: "fitbit",
      description: "Activity Trackers",
      logo: "https://storage.googleapis.com/vital-assets/fitbit.png",
      authType: "oauth",
      supportedResources: [
        "activity",
        "blood_oxygen",
        "body",
        "body_temperature",
        "body_temperature_delta",
        "calories_active",
        "distance",
        "fat",
        "heart_rate_alert",
        "heartrate",
        "hrv",
        "hypnogram",
        "profile",
        "respiratory_rate",
        "sleep",
        "sleep_cycle",
        "sleep_stream",
        "steps",
        "vo2_max",
        "water",
        "weight",
        "workout_stream",
        "workouts",
      ],
    },
    {
      name: "Eight Sleep",
      slug: "eight_sleep",
      description: "Smart Mattress",
      logo: "https://storage.googleapis.com/vital-assets/eightsleep.png",
      authType: "password",
      supportedResources: [
        "heartrate",
        "hrv",
        "hypnogram",
        "profile",
        "respiratory_rate",
        "sleep",
        "sleep_cycle",
        "sleep_stream",
      ],
    },
    {
      name: "Strava",
      slug: "strava",
      description: "Activity Social Network",
      logo: "https://storage.googleapis.com/vital-assets/strava.png",
      authType: "oauth",
      supportedResources: ["heartrate", "workout_stream", "workouts"],
    },
  ];

  export default supportedProviders