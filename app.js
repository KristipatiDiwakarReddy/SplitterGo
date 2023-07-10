//jshint esversion:6

require('dotenv').config()
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const md5 = require('md5');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const qs = require('qs');


const app  = express();

let n=0;
let spent=[];
let paid=[];
let amount=[];
//let names=[];
let payingP=[];
let money=[];
let gettingP=[];
let userName = "";
let userId = "";

let num;
let names;
let matrix;

app.use(session({
  secret: 'thebiglittlesecret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  phoneNumber: String,
  role: String
});

userSchema.plugin(passportLocalMongoose);


  //const secret = process.env.SECRET;
  //userSchema.plugin(encrypt, {secret : secret, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

const transactionSchema = new mongoose.Schema({
  payer: String,
  money: Number,
  receiver: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});


const Transactions = mongoose.model('Transactions', transactionSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(express.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static("public"));


function getMin(arr) {
    var minInd = 0;
    for (let i = 1; i < arr.length; i++) if (arr[i] < arr[minInd]) minInd = i;
    return minInd;
  }

  function getMax(arr) {
    var maxInd = 0;
    for (let i = 1; i < arr.length; i++) if (arr[i] > arr[maxInd]) maxInd = i;
    return maxInd;
  }

  function minOf2(x, y) {
    return x < y ? x : y;
  }

function minCashFlowRec(amount) {
    // Find the indexes of minimum and
    // maximum values in amount
    // amount[mxCredit] indicates the maximum amount
    // to be given (or credited) to any person .
    // And amount[mxDebit] indicates the maximum amount
    // to be taken(or debited) from any person.
    // So if there is a positive value in amount,
    // then there must be a negative value
    var mxCredit = getMax(amount);
    var mxDebit = getMin(amount);

    // If both amounts are 0, then
    // all amounts are settled
    if (amount[mxCredit] === 0 && amount[mxDebit] === 0) return;

    // Find the minimum of two amounts
    var min = minOf2(-amount[mxDebit], amount[mxCredit]);
    amount[mxCredit] -= min;
    amount[mxDebit] += min;

    let mxDebitPerson = mxDebit + 1;
    let mxCreditPerson = mxCredit + 1;
    // If minimum is the maximum amount to be
    console.log("person " + names[mxDebit] + " pays " + min + " to " + "person " + names[mxCredit]);
    console.log(userId);

    payingP.push(names[mxDebit]);
    money.push(min);
    gettingP.push(names[mxCredit]);

    const trans = new Transactions({
      payer: names[mxDebit],
      money: min,
      receiver: names[mxCredit],
      user: userId
    });

    trans.save().catch(function(err){
     console.log(err);
     console.log("userId is empty. Skipping transaction save.");
    });


    // Recur for the amount array.
    // Note that it is guaranteed that
    // the recursion would terminate
    // as either amount[mxCredit]  or
    // amount[mxDebit] becomes 0
    minCashFlowRec(amount);
  }


app.get("/", function(req, res){
  res.render("home");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/logout", function(req, res){

  req.logout(function(err){
    if (err) {
      console.log(err);
    } else {
      res.redirect("/login");
    }
  });

})

app.get("/secrets", function(req, res){
  if (req.isAuthenticated()) {
    console.log(userName);
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/transactions", function(req, res){
  if (req.isAuthenticated()) {
    console.log(userName);

    Transactions.find({ user: userId }).then((user) => {
      console.log(user);
      // transUsers=user;
      console.log(typeof(user));
      res.render("transactions", {user} );
    }).catch(function(err){
      console.log(err);
    });

    // res.render("transactions" {user} );
  } else {
    res.redirect("/login");
  }
});

app.get("/delete", function(req, res){
  Transactions.deleteMany({ user: userId }).then((x) => {
    console.log(x);
    res.render("transactions", {user: []} );
  }).catch(function(err){
    console.log(err);
  });
});

// app.get("/mat", function(req, res){
//   res.render("mat", { matrix: null });
// });
//
// function createMatrix(numPeople) {
//   const matrix = [];
//   for (let i = 0; i < numPeople; i++) {
//     matrix.push(Array(numPeople).fill(0));
//   }
//   return matrix;
// }
//
// app.post('/mat', (req, res) => {
//   numPeople = parseInt(req.body.numPeople);
//   const matrix = createMatrix(numPeople);
//   const names = JSON.parse(req.body.names);
//   res.render('mat', { matrix, names });
// });
//

app.get("/trail", function(req, res){
  if (req.isAuthenticated()) {
    console.log(userName);
    payingP.length=0;
    money.length=0;
    gettingP.length=0;
    spent.length=0;
    paid.length=0;
    num=0;
    res.render("trail", { num, names, matrix, payingP, money, gettingP} );
  } else {
    res.redirect("/login");
  }
});


app.post('/trail', (req, res) => {

  payingP.length=0;
  money.length=0;
  gettingP.length=0;
  spent.length=0;
  paid.length=0;

  if (!num) {
    num = parseInt(req.body.numPeople);
    res.render("trail", { num, names, matrix, payingP, money, gettingP}); // Redirect to the main page to render the next form
  } else if (!(names) || names.length===0) {
    names = [];
    for (let i = 0; i < num; i++) {
      const name = req.body['name-' + i];
      names.push(name);
    }
    res.render("trail", {num, names, matrix, payingP, money, gettingP}); // Redirect to the main page to render the next form
  } else if (!matrix || matrix.length===0) {
    matrix = [];
    for (let i = 0; i < num; i++) {
      matrix.push([]);
      for (let j = 0; j < num; j++) {
        if (i !== j) {
          const amount = parseFloat(req.body['amount-' + i + '-' + j]);
          matrix[i].push(amount);
        } else {
          matrix[i].push(0);
        }
      }
    }
    console.log(matrix);

    var amount=Array.from({length: num}, (_, i) => 0);

       // Calculate the net amount to
       // be paid to person 'p', and
       // stores it in amount[p]. The
       // value of amount[p] can be
       // calculated by subtracting
       // debts of 'p' from credits of 'p'
       for (p = 0; p < num; p++)
       for (i = 0; i < num; i++)
           amount[p] += (matrix[i][p] - matrix[p][i]);

       minCashFlowRec(amount);
       console.log(payingP);
       console.log(money);
       console.log(gettingP);

       res.render("trail", { num, names, matrix, payingP, money, gettingP});

       num=0;
       names.length=0;
       matrix.length=0;





    // res.redirect('/result'); // Redirect to a result page or perform further processing
  }
});



// app.post('/mat', (req, res) => {
//   n = parseInt(req.body.numPeople);
//   res.render("trail", { n, names, matrix }); // Redirect to the main page to render the next form
// });
//
// app.post('/names', (req, res) => {
//   names = [];
//   for (let i = 0; i < n; i++) {
//     const name = req.body['name-' + i];
//     names.push(name);
//   }
//   res.render("trail", { n, names, matrix }); // Redirect to the main page to render the next form
// });
//
// app.post('/matrix', (req, res) => {
//   matrix = [];
//   for (let i = 0; i < n; i++) {
//     matrix.push([]);
//     for (let j = 0; j < n; j++) {
//       if (i !== j) {
//         const amount = parseFloat(req.body['amount-' + i + '-' + j]);
//         matrix[i].push(amount);
//       } else {
//         matrix[i].push(0);
//       }
//     }
//   }
//   console.log(matrix);
//
//   // res.redirect('/result'); // Redirect to a result page or perform further processing
// });






// app.post('/calculate', (req, res) => {
//   // Retrieve the matrix values from the request body
//   const matrix = [];
//
//   for (let i = 0; i < numPeople; i++) {
//     const row = [];
//     for (let j = 0; j < numPeople; j++) {
//       if (i === j) {
//         row.push(0);
//       } else {
//         const amount = parseFloat(req.body[`amount-${i}-${j}`]);
//         row.push(amount);
//       }
//     }
//     matrix.push(row);
//   }
//
//   // Log the matrix
//   console.log(matrix);
//
//   // Handle the rest of the calculation based on the matrix
//
//   res.send('Calculation result');
// });



app.post("/secrets", function(req, res){

  console.log(req.body.n);
  n=parseInt(req.body.n);

  names=[];

  payingP.length=0;
  money.length=0;
  gettingP.length=0;
  names.length=0;
  spent.length=0;
  paid.length=0;

   pa = req.body.p;
   sp = req.body.s;
   na= req.body.name;

 if (typeof req.body.p !== "undefined") {
   pa.forEach((element)=>{
     ele=parseInt(element)
     paid.push(ele);
   })

   sp.forEach((element)=>{
     ele=parseInt(element)
     spent.push(ele);
   })

   na.forEach((element)=>{
     ele=element
     names.push(ele);
   })
 }

  console.log("hi");
  console.log(names);
  console.log(spent);
  console.log(paid);

  let amount = paid.map((element, index) => element - spent[index]);

  console.log(amount);

  let sumSpent = 0;
  let sumPaid = 0;

  for (let index = 0; index < paid.length; index++) {
    sumPaid = paid[index] + sumPaid;
  }

  for (let index = 0; index < spent.length; index++) {
    sumSpent = spent[index] + sumSpent;
  }

  console.log(sumPaid);
  console.log(sumSpent);
  console.log(userName);

  if (sumPaid !== sumSpent) {
    console.log("Wrong Input-Sum of Spent amount must be equal to Paid amount");
  }

  if (typeof req.body.p !== "undefined") {

    // User.findOne({ username: userName }).then((user) => {
    //   // Access the _id of the user
    //   userId = user._id;
    //   console.log("bye");
    //   console.log('User ID:', userId);
    // }).catch(function(err){
    //   console.log(err);
    // });

    minCashFlowRec(amount);
    console.log(payingP);
    console.log(money);
    console.log(gettingP);
  }


  res.render("secrets", {n, payingP, money, gettingP});

  payingP.length=0;
  money.length=0;
  gettingP.length=0;
  names.length=0;
  spent.length=0;
  paid.length=0;

});

app.post("/register", function(req, res){

  const { username, password, tel, role } = req.body;

  console.log(typeof(phoneNumber));
  const newUser = new User({
    username: username,
    password: password,
    phoneNumber: tel,
    role: role
  });


  User.register(newUser, password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/login");
      })
    }
  })


});


/*

const newUser = new User({
  username: req.body.username,
  password: md5(req.body.password)
});

newUser.save();
res.render("secrets")

*/

app.get("/mode", (req, res)=>{
  if (req.isAuthenticated()) {
    console.log(userName);
    res.render("mode");
  } else {
    res.redirect("/login");
  }
});

app.post("/login", function(req, res){

    userName=req.body.username;
    console.log(userName);
    const user = new User({
      username: req.body.username,
      password: req.body.password
    })

    req.login(user, function(err){
      if (err) {
        console.log(err);
      }
      passport.authenticate("local")(req, res, function(){
        userId = req.user._id;
        console.log("User ID:", userId);
        res.redirect("/mode");
      })
    })

});

/*

const username= req.body.username;
const password= md5(req.body.password);

User.findOne({username}).then(function(foundUser){
  console.log(foundUser);
  if (foundUser.password===password) {
    res.render("secrets");
  }
}).catch(function(err){
  console.log(err);
});


*/

app.listen(3000, function(){
  console.log("Successfully connected on port 3000");
});
