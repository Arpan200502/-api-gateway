//Dummy data for now , later switch to a real DB before Deploy

const db=[
  {apikey:"abc123",
  routes:[
      {path:"/",targetURL:"https://backend-ufna.onrender.com/",cache:true,cacheTTL:60,rateLimit:3}
  ]},
   {apikey:"abc124",
  routes:[
      {path:"/posts",targetURL:"https://jsonplaceholder.typicode.com",cache:true,cacheTTL:60,rateLimit:100}
  ]},

   {apikey:"abc125",
  routes:[
      {path:"/dummy",targetURL:"https://backend-ufna.onrender.com/",cache:true,cacheTTL:60,rateLimit:100}
  ]},

]


module.exports = db;