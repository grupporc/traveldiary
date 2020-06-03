var request = require('request');

async function controllaEvento(a_t, req, res, citta, data)
{
    if(citta=='.DS_Store')
        return;
    
    var lista2=new Array();
	
	var options={
	    url:'https://www.googleapis.com/calendar/v3/calendars/primary/events',
	    headers: {
	        'Authorization': 'Bearer '+a_t,
	    }
    };
    request(options, function(error, response, body){
        if (error)
            console.log(error);
        
        var info = JSON.parse(body);
        var lista=info.items;

        if(lista!=null)
        {
            for(var i=0; i<lista.length; i++)
            {
                if(lista[i].start == undefined) 
                    continue;
                else 
                    lista2.push(lista[i].start.date);
            }

            if(lista2.includes(data))
            {
		      	console.log("evento già aggiunto!!");
		    }
            else
            {
                aggiungiEvento(a_t, req, res, citta, data);
		    }
        }
    });
}

function aggiungiEvento(a_t, req, res,citta,data)
{
    var url= 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    var headers= {
        'Authorization': 'Bearer '+a_t,
        'Content-Type': 'application/json'
    };
    var body1={
        'descrition' : 'Vacanza a '+citta,
        'summary' : citta,
        'location': citta,
        'end': {
            'date' : data,
        },
        'start':{
            'date': data,
        },
        'visibility' : 'public',
    };
    request({
        headers:headers, 
        url:url, 
        method:'POST', 
        body:JSON.stringify(body1)
    }, function(error,response,body){
        if(error)
            console.log(error);

        console.log('Aggiunto evento '+citta);
    });
}

module.exports.aggiungiEvento = aggiungiEvento;
module.exports.controllaEvento = controllaEvento;