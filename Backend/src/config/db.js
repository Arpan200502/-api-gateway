const db=[
  {apikey:"abc123",
  routes:[
      {path:"/",targetURL:"https://backend-ufna.onrender.com/",cache:true,rateLimit:3}
  ]},
   {apikey:"abc124",
  routes:[
      {path:"/posts",targetURL:"https://jsonplaceholder.typicode.com",cache:true,rateLimit:100}
  ]},

   {apikey:"abc125",
  routes:[
      {path:"/dummy",targetURL:"https://backend-ufna.onrender.com/",cache:true,rateLimit:100}
  ]},

]


module.exports = db;