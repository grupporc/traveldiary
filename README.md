### TRAVEL DIARY: progetto per il corso di Reti di calcolatori 2019-2020

Realizzato da:
Bianchini Silvia 1796898,
Davidde Francesca 1792368,
Ferrazzi Valentina 1756819,
Evangelisti Martina 1796480

### Requisiti:
1. Il servizio REST che implementate (lo chiameremo SERV) deve offrire all'esterno delle API documentate con swagger per esempio
2. SERV si deve interfacciare con almeno due servizi REST “esterni”, cioè non su localhost (e.g. google maps)
3. Almeno uno dei servizi REST esterni deve essere “commerciale” (es: twitter, google, facebook, pubnub, parse, firbase etc)
4. Almeno uno dei servizi REST esterni deve richiedere oauth (e.g. google calendar)
5. Si devono usare Websocket e/o AMQP (o simili es MQTT)
6. Il progetto deve essere su GIT (GITHUB, GITLAB ...) e documentato don un README che illustri almeno scopo del progetto, tecnologie usate, come installarlo, come far girare i casi di test
7. Le API REST implementate in SERV devono essere documentate su GIT e devono essere validate con un caso di test 

### Tecnologie utilizzate:
REST 1: Google (OAuth)
REST 2: Facebook (OAuth)
REST 3: Google Calendar
REST 4: Google Photo
REST 5: MapBox (per visualizzare mappa con marker)
REST 6: OpenWeather (per ottenere latitudine e longitudine da passare ai marker della mappa)
REST 7: SkyScanner (per informazioni sui biglietti aerei)
REST 8: Google Place (per informazioni sulle attrazioni)
AMQP: Rabbit

### Breve descrizione
Travel Diary è un’applicazione web che permette all’utente di ottenere e mantenere aggiornato un proprio diario di viaggio, nonché ricevere informazioni in tempo reale sui voli aerei e suggerimenti su attrazioni da visitare in un dato luogo di interesse.
Una volta che l’utente ha eseguito il login con Facebook e con Google, le foto presenti sul proprio profilo Facebook vengono automaticamente raccolte ed organizzate in album fotografici. Per ogni città visitata viene aggiunto l’album e l’evento corrispondente su Google Photo e Google Calendar. Oltre a visualizzare il diario di viaggio, grazie alle API di Google Maps e Open Weather, all’utente è offerta la possibilità di visualizzare una mappa sulla quale vengono inseriti marker per ogni località visitata. L’utente quindi può avere un quadro completo dei propri ricordi di viaggio con tanto di data, foto e posizione.
Oltre a queste funzionalità, grazie all’interazione con SkyScanner, è possibile cercare biglietti aerei ed aggiungere, in caso si fosse interessati ad un dato volo, l’evento corrispondente su Google Calendar. Il calendario rimane quindi aggiornato non solo sui viaggi passati, ma anche sui possibili viaggi futuri. Per completezza, grazie alle API di Google Place, l’utente può ricevere informazioni riguardanti i luoghi di maggior interesse in una data città, e quindi decidere se aggiungere o meno la meta al proprio Calendario. 

### Funzionamento 
Si avviano rpc_server.js e app.js, dopo l'avvio di app.js, il server è in ascolto sulla porta 8888. Digitando nel browser https://localhost:8888 si verrà reindirizzati alla pagina inziale login.ejs. Come suggerito dalla pagina web, per poter usufruire del servizio è necessario eseguire l’accesso sia con Facebook, che con Google. Una volta premuti entrambi i bottoni si può avere completo accesso alle funzionalità dell’applicazione. Durante il processo di autenticazione, grazie agli scopes inseriti nella richiesta OAuth per Facebook, vengono ricavate informazioni sulla hometown dell’utente e sulle foto presenti sul profilo che vengono prelevate con la relativa posizione e la relativa data. L’autenticazione tramite Google prevede invece di richiedere l’autorizzazione per interagire con i servizi di Google Photo e Google Calendar. Una volta ottenuti tutti i permessi e le informazioni necessarie, si aprirà la pagina home.ejs. All’utente viene fornita tramite la prima form, la possibilità di ottenere informazioni sulle principali attrazioni presenti in una data località. Il testo inserito nella form dall’utente viene passato come parametro nella richiesta al servizio di Google Place. La risposta alla request viene visualizzata su un’apposta pagina (attrazioni.ejs) e conta di una lista di luoghi da visitare.  Grazie alla seconda form presente in home.ejs, l’utente può invece ricercare voli aerei per una determinata tratta e in una determinata data. I biglietti aerei visualizzati in seguito al submit della form sono stati ricavati tramite una GET a Skyscanner. Lato server vengono prima cercati gli aeroporti nella città di partenza e di arrivo e in seguito, grazie ad una terza richiesta in cui vengono passati come parametri gli aeroporti di arrivo trovati, gli aeroporti di partenza trovati e la data inserita, è possibile visualizzare i biglietti aerei disponibili con tanto di prezzo. La lista dei biglietti trovati viene visualizzata nella pagina voli.ejs che, in aggiunta, dispone di un bottone grazie al quale l’utente può inserire nella data corrispondete al volo cercato, un evento su Google Calendar. 
Come terza opzione, l’utente ha la possibilità di ottenere il proprio diario di viaggio.
Al caricamento della pagina home.ejs vengono scaricate in modo asincrono le foto da Facebook che attiveranno al termine un bottone per ottenere il diario.
Dopo aver premuto sul bottone ‘ottieni il mio diario’, le foto prelevate dal profilo Facebook e organizzate in base alla posizione, vengono caricate su Google Photo (un album per ogni città visitata).  La funzione aggiungiAlbum come prima cosa verifica se l’album corrispondete ad una data località è già esistente.  Nel caso in cui non lo fosse, si occupa della creazione di un nuovo oggetto album. Le funzioni crea e carica foto, si occupano rispettivamente della creazione e del caricamento dell’oggetto foto in uno specifico album precedentemente creato. 
In base alla data un cui le foto sono state caricate su Facebook, viene aggiunto un evento corrispondete su Google Calendar. Anche in questo caso viene prima controllato che non esitano altri eventi per quella specifica data. 
Per quanto riguarda la realizzazione ed il funzionamento della mappa, questo è reso possibile grazie a Mapbox. Ogni marker, corrispondente ad una precisa località, viene aggiunto alla mappa in seguito ad un’interrogazione al database (CouchDB). Il risultato della query è la lista di tutti i viaggi dell’utente. Ogni entry viene passata come parametro ad una GET ad OpenWeather. Questa richiesta è necessaria per ricevere informazioni riguardo alla latitudine e alla longitudine di un determinato luogo e dunque per il posizionamento e l’aggiunta del rispettivo marker. 
Per eseguire il logout e cancellare la cartella di appoggio creata per la gestione e il caricamento delle foto l’applicazione web è dotata di un bottone apposito. 


### SetUp iniziale
Per poter utilizzare l’applicazione è necessario avviare su Docker RabbitMQ e CoachDB.

I moduli necessari per l’applicazione sono:
>> npm install express
>> npm install request
>> npm install body-parser
>> npm install cookie-parser
>> npm install express-session
>> npm install fs
>> npm install dotenv

