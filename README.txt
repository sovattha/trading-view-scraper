# TRADING VIEW SCRAPER

Récupère les "données" des charts de INTOTHEBLOCK:XXX_WHALESPERCENTAGE sur Trading View.

## Description des fichiers

- cryptos.txt : liste des cryptos, séparées par des sauts de ligne. Obligatoire.
- invalid-cryptos.txt : liste des cryptos invalides, générées par le programme. Ne pas toucher mais corriger le fichier cryptos.txt en fonction.
- start.bat : démarre le scraper et ne ferme pas la fenêtre après son exécution.
- trading-view-scraper.exe : fichier exécutable principal. La fenètre se ferme après exécution.
- whales.json : fichier de sortie au format JSON.

## Exécution

Le fichier whales.json se met à jour uniquement à la fin de l'exécution du scraper.

Actuellement, 900 cryptos prennent environ 10 minutes.

Il y a des limites d'appel (limites non communiquées) imposées par Trading View. 

Le scraper effectue environ 5 appels par seconde, qui semble proche de la valeur maximale.
