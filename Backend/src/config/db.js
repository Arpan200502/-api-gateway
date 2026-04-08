// Dummy data for now , later switch to a real DB before Deploy

const db = [
  {
    apikey: "abc123",
    targets: [ "http://localhost:5001",  "http://localhost:5002", "http://localhost:5003"],

    routes: [
        { path: "/",cache: true,cacheTTL: 60, rateLimit: 10}, 
        { path: "/users", cache: true, cacheTTL: 30, rateLimit: 10 },
        { path: "/posts", cache: true, cacheTTL: 60, rateLimit: 10 }
    ]
  },{
    apikey: "abc124",
    targets: [
      "https://jsonplaceholder.typicode.com"
    ],
    routes: [
      { path: "/posts",cache: true,cacheTTL: 60, rateLimit: 100 },
      { path: "/comments",cache: true,cacheTTL: 60,rateLimit: 100 }
    ]
  },
  {
    apikey: "abc125",
    targets: [
      "https://backend-ufna.onrender.com"
    ],
    routes: [
      {path: "/dummy",cache: true,cacheTTL: 60,rateLimit: 100}
    ]
  }
];

module.exports = db;