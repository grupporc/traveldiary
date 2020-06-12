# API REST

## GOOGLE CALENDAR

* Richiesta HTTP GET https://www.googleapis.com/calendar/v3/calendars/primary

  Ottengo informazioni sul calendario dell'utente (es: ID del calendario). 

* Richiesta HTTP GET https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=9999&singleEvents=true

  Ottengo la lista degli eventi presenti nel calendario dell'utente e il numero massimo di risultati per pagine è 9999.
  
  Parametri:
     * calendarId: primary (required)
     * maxResults: '9999'
     * singleEvents: true
  

* Richiesta HTTP POST https://www.googleapis.com/calendar/v3/calendars/primary/events
  
  Creo un evento nel calendario dell'utente.

  Parametri:
     * calendarId: primary (required)
     
Documentazione ufficiale [qui](https://developers.google.com/calendar/).


## GOOGLE PHOTO

* Richiesta HTTP GET https://photoslibrary.googleapis.com/v1/albums?excludeNonAppCreatedData=true&pageSize=50'

  Ottengo gli album dell'utente creati dalla nostra applicazione e il numero massimo di risultati per pagina è 50.
  
  Parametri:
    * excludeNonAppCreatedData: true
    * pageSize: '50'


* Richiesta HTTP POST https://photoslibrary.googleapis.com/v1/albums/
  
  Creo un nuovo album ed il suo titolo è quello passato nel body della richiesta
  

* Richiesta HTTP POST https://photoslibrary.googleapis.com/v1/uploads
  
  Carico il flusso di byte sul server di Google e mi viene restituito un token di upload
  

* Richiesta HTTP POST https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate

  Aggiungo uno o più elementi multimediali nella libreria di Google Foto di un utente a un album.
  
  Parametri:
    * albumId: Id dell'album (required)
    
Documentazione ufficiale [qui](https://developers.google.com/photos).


## GOOGLE PLACE

* Richiesta HTTP GET "https://maps.googleapis.com/maps/api/place/textsearch/json?query="+citta+"+point+of+interest&key="+process.env.GGAPIKEY

  Ottengo i punti di interesse di una determinata città.
  
  Parametri:
    * query: 'citta,punti di interesse'
    * key: API key dell'applicazione (required)
    
Documentazione ufficiale [qui](https://developers.google.com/places/web-service/intro).
  
## SKYSCANNER

* Richiesta HTTP GET "https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/autosuggest/v1.0/IT/EUR/en-GB/?query="+partenza
  
  Ottengo la lista di tutti gli aeroporti della città di partenza.
  
  Parametri:
    * "x-rapidapi-key": API key dell'applicazione (required)
    * query: città di partenza

* Richiesta HTTP GET "https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/autosuggest/v1.0/IT/EUR/en-GB/?query="+arrivo
  
  Ottengo la lista di tutti gli aeroporti della città di arrivo.

  Parametri:
    * "x-rapidapi-key": API key dell'applicazione (required)
    * query: città di arrivo
  
* Richiesta HTTP GET "https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/browseroutes/v1.0/IT/EUR/en-GB/"+aerP+"/"+aerA+"/"+data

  Ottengo una lista di tutti i voli a partire dalla data inserita dall'utente fino alla fine del mese. 
  
  Parametri: 
    * "x-rapidapi-key": API key dell'applicazione (required)
    * aerP: lista di tutti gli aeroporti di partenza
    * aerA: lista di tutti gli aeroporti di arrivo
    * data: data
    
Documentazione ufficiale [qui](https://rapidapi.com/skyscanner/api/skyscanner-flight-search).   


## FACEBOOK

* Richiesta HTTP GET "https://graph.facebook.com/me?fields=id,hometown&access_token="+req.session.FBtoken

  Ottengo l'Id dell'utente e la sua città di origine.
  
  Parametri:
    * fields: 'id,hometown'
    * access_token: token dell'utente (required)

* Richiesta HTTP GET "https://graph.facebook.com/me/photos?limit=500&type=uploaded&fields=place,created_time,images&access_token="+req.session.FBtoken
  
  Richiedo le informazioni riguardanti le foto caricate dall'utente sul suo profilo (al massimo 500), tra cui data di creazione e luogo.
  
  Parametri:
    * limit: '500'
    * type: 'uploaded'
    * fields: 'place,created_time,images'
    * access_token: token dell'utente (required)
  
Documentazione ufficiale [qui](https://developers.facebook.com/docs/platforminsights/page).   


## OPENWEATHER

* Richiesta HTTP GET 'http://api.openweathermap.org/data/2.5/weather?q='+viaggio+'&appid='+process.env.METEO_KEY

  Ottengo le coordinate riguardanti la città inserita (es: latitudine, longitudine) e ulteriori dettagli meteorologici.
  
  Parametri:
    * q: luogo
    * appid: API key (required)
    
Documentazione ufficiale [qui](https://rapidapi.com/community/api/open-weather-map).

  
    

