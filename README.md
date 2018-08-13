# Youtube-Scraper

Cet utilitaire permet de récupérer toutes les métadonnées des vidéos et des commentaires de chaines youtube choisies au préalable, en calulant l'évolution de certaines features dans le temps
Il se présente sous la forme d'une application python/django

## Installation

### Paquets Python

Pour faire fonctionnerle projet, il faut d'abord installer les dépendances pip depuis le dossier du projet (on peut aussi tout faire depuis un venv bien entendu)

	pip3 install -r requirements.txt

### BDD Postgre

Le projet repose sur une base de données Postgre, donc il faut l'installer

	sudo apt-get update
	sudo apt-get install python-pip python-dev libpq-dev postgresql postgresql-contrib

On se connecte ensuite à Postgre (si ça marche pas, il faut spammer Entrée)

	sudo su - postgres
	psql

On peut alors créer la base de données du projet


	CREATE DATABASE youtube_scraper;
	CREATE USER django WITH PASSWORD 'bonjour';
	ALTER ROLE django SET client_encoding TO 'utf-8';
	ALTER ROLE django SET default_transaction_isolation TO 'read commited';
	ALTER ROLE django SET timezone TO 'UTC';
	GRANT ALL PRIVILEGES ON DATABASE youtube_scraper TO django;

On quitte le shell avec 

	\q
	exit

### Serveur Neo4J

Il faut d'abord récupérer le serveur Neo4J à l'adresse <https://neo4j.com/download-thanks/?edition=community&release=3.4.5&flavour=unix> et le mettre dans le dossier du projet

On lance ensuite un script d'installation : 

	bash install-neo4j.sh


### Paramétrage du projet

Puis on configure la base de données

	python3 manage.py makemigrations
	python3 manage.py migrate

Dans le dossier du projet, lancer la commande suivante pour créer un compte utilisateur permettant d'accéder à l'interface d'administration de Django :

	python3 manage.py createsuperuser

Ensuite on lance le serveur (ces commandes doivent être rentrées à chaque fois que l'on veut relancer l'application)

	./neo4j/bin/neo4j start
	bash linkurious-linux/start.sh
	python3 manage.py runserver

Lancer un navigateur et se connecter à l'adresse <http://127.0.0.1:8000/autoconfig>

Le projet est maintenant pleinement fonctionnel en se rendant à l'adresse <http://127.0.0.1:8000/> (la redirection est automatique normalement depuis la page de config)

