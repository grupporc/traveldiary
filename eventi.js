var request = require('request');

async function controllaEvento(a_t, citta, data){
    if (citta=='.DS_Store') return;

    var lista2=new Array();
	var options={
	url:'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=9999&singleEvents=true',
	headers: {
	    'Authorization': 'Bearer '+a_t,
	    }
    };
    request(options, function(error, response, body){
    	if (!error && response.statusCode == 200){
        var info = JSON.parse(body);
        var lista=info.items; 
        if(lista!=null){
            for(var i=0; i<lista.length; i++){
                if(lista[i].start == undefined) continue;
            	lista2.push(lista[i].start.date);
        	}
			if(lista2.includes(data)){
		      	console.log("Evento già aggiunto!!");
		    }
		    else{
		      	aggiungiEvento(a_t,citta, data);
		    }
        }
      }
    });
}

function aggiungiEvento(a_t,citta,data){
    var url= 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    var headers= {
        'Authorization': 'Bearer '+a_t,
        'Content-Type': 'application/json'
    };
    var body1={
        'description' : 'Vacanza a '+citta,
        'summary' : citta,
        'location': citta,
        'end': {
        'date' : data,
        },
        'start':{
        'date': data,
        },
        'visibility': 'public'
    };
    request({headers:headers, url:url, method:'POST', body:JSON.stringify(body1)}, function(error,response,body){
        console.log('Aggiunto evento '+citta);
    });
}

module.exports.aggiungiEvento = aggiungiEvento;
module.exports.controllaEvento = controllaEvento;