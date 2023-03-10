App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  hasVoted: false,

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    // TODO: refactor conditional
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: function() {
    $.getJSON("Election.json", function(election) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Election = TruffleContract(election);
      // Connect provider to interact with contract
      App.contracts.Election.setProvider(App.web3Provider);
      // App.listenForEvents();
      return App.render();
    });
    $.getJSON("Register.json", function(register) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Register = TruffleContract(register);
      // Connect provider to interact with contract
      App.contracts.Register.setProvider(App.web3Provider);
      // App.listenForEvents();
      return App.render();
    });
  },


  // listen for events emitted from the contract
  listenForEvents: function() {
    App.contracts.Election.deployed().then(function(instance) {
      instance.votedEvent({},{
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("event triggered", event)
        // Reload when a new vote is recorded
        App.render();
      });
    });
  },


  render: function() {
    var electionInstance;
    var registerInstance;

    var loader = $("#loader");
    var content = $("#content");

    var verifyPanel = $("#verifyPanel");
    var votingPanel = $("#votingPanel");
    var endElectionPanel = $("#endElection");

    loader.show();
    content.hide();

    // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("<b>Your Account Address:</b> <br>" + account);
      }
    });


    // Load verification status
    App.contracts.Register.deployed().then(function(instance) {
      return instance.isEligble(App.account);
    }).then(function(isElig) {
      if (isElig==true){
        votingPanel.show();
        endElectionPanel.show();
        verifyPanel.hide();
        // $("#addressRegistrationStatus").html("Verification Success. Your account is registered");
      }
      else {
        $("#addressRegistrationStatus").html("");
      }
    }).catch(function(error) {
      console.warn(error);
    });

    App.contracts.Election.deployed().then(function(instance) {
      instance.ended().then(function(end_status) {
        ended = end_status;
        console.log("End check");
        console.log(end_status);
        if (ended==true){
          console.log('Endededdddd');
          $("#verifyPanel").hide();
          $("#votingPanel").hide();
          $("#endElectionPanel").hide();
          $("#resultsPanel").show();
        }
        console.log("Here");            
      })
    });

    // Load contract data
    App.contracts.Election.deployed().then(function(instance) {
      electionInstance = instance;
      return electionInstance.candidatesCount();
    }).then(function(candidatesCount) {
      var candidatesResults = $("#candidatesResults");
      candidatesResults.empty();

      var candidatesSelect = $('#candidatesSelect');
      candidatesSelect.empty();

      for (var i = 1; i <= candidatesCount; i++) {
        electionInstance.candidates(i).then(function(candidate) {
          var id = candidate[0];
          var name = candidate[1];
          var voteCount = candidate[2];

          // Render candidate Result
          var candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>"
          candidatesResults.append(candidateTemplate);

          // Render candidate ballot option
          var candidateOption = "<option value='" + id + "' >" + name + "</ option>"
          candidatesSelect.append(candidateOption);
        });
      }
      return electionInstance.voters(App.account);
    }).then(function(hasVoted) {
      // Do not allow a user to vote
      if(hasVoted) {
        $('form').hide();
        var chosen;
        App.contracts.Election.deployed().then(function(i) {
          i.candidates($('#candidatesSelect').val()).then(function(j) {
            console.log(j);
            chosen=j[1]; // Careful: hardcoded index for name
            console.log(chosen);
            $('#voteStatus').show();
            // $("#voteStatusText").html("You have voted for <b>"+chosen+"</b>! Thanks for participating.");
            $("#voteStatusText").html("Thanks for voting!");
          })
        });        
      }
      loader.hide();
      content.show();
    }).catch(function(error) {
      console.warn(error);
    });
  },

  castVote: function() {
    var candidateId = $('#candidatesSelect').val();
    App.contracts.Election.deployed().then(function(instance) {
      return instance.vote(candidateId, { from: App.account });
    }).then(function(result) {
      // Wait for votes to update
      $("#content").hide();
      $("#loader").show();
    }).catch(function(err) {
      console.error(err);
    });
  },


  registerAddr: function() {
    var passc = $('#passc').val();
    App.contracts.Register.deployed().then(function(instance) {
      return instance.verify(passc, { from: App.account });
    }).then(function(result) {
      $("#content").hide();
      $("#loader").show();
    }).catch(function(err) {
      console.error(err);
    });
  },      

  endElection: function() {
      // var candidateId = $('#candidatesSelect').val();
      // var electionInst;
      App.contracts.Election.deployed().then(function(i) {
        electionInst = i;
        electionInst.endElection(1, { from: App.account }).catch(function(err){console.log("oops!");console.log(err);});
        $("#votingPanel").hide();
        $("#resultsPanel").show();
        $('#resultDeclaration').show();
        $("#resultText").html(electionInst.candidates(1).voteCount);
      });
      
  } 

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
