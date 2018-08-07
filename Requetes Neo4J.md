

# Ecport de la BDD PostgreSQL

## Export des users

	\copy (SELECT * FROM dashboard_user) TO '/home/postgres/export_users.csv' WITH CSV HEADER

## Export des commentaires

	\copy (SELECT id,author_id,"commentId","likeCount","parentCom_id","publishedAt","videoId","channelId","replyCount" FROM dashboard_comment) TO '/home/postgres/export_comments.csv' WITH CSV HEADER

## Export des videos

	\copy (SELECT id,"videoId","publishedAt","channelId","title","categoryId","duration","viewCount","likeCount","dislikeCount","favoriteCount","commentCount" from dashboard_video) TO '/home/postgres/export_videos.csv' WITH CSV HEADER

# Chargement des fichiers csv de l'étude

## Utilisateurs
	LOAD CSV WITH HEADERS FROM "file:///export_users.csv" AS row 
	FIELDTERMINATOR ',' 
	CREATE (u:Tempuser) SET u=row;

	MATCH (u:Tempuser)
	WITH DISTINCT u.userId as userId, u.userName as userName
	CREATE (r:User) SET r.userId = userId;

	MATCH (u:Tempuser),(r:User)
	WHERE u.userId=r.userId
	SET r.userName = u.userName;



## Vidéos
	LOAD CSV WITH HEADERS FROM "file:///export_videos.csv" AS row 
	FIELDTERMINATOR ',' 
	CREATE (v:Video) SET v=row;

	MATCH (v:Video)
	WITH DISTINCT v.channelId as channelId
	CREATE (t:Tempuser) 
	SET t.userId=channelId AND t.userName="nan"

## Commentaires
	LOAD CSV WITH HEADERS FROM "file:///export_comments.csv" AS row 
	FIELDTERMINATOR ',' 
	CREATE (c:Comment) SET c=row;

	MATCH (u:Tempuser),(c:Comment)
	WHERE c.author_id = u.id
	SET c.userId=u.userId;

# Calcul des liens

## Lien User-Comment

	MATCH (u:User),(c:Comment)
	WHERE u.userId = c.userId
	CREATE (u)-[:hasWritten]->(c)

## Lien Comment-Video

	MATCH (c:Comment),(v:Video)
	WHERE c.videoId = v.videoId
	CREATE (c)-[:commentToVideo]->(v)

## Lien Comment-Replies

	MATCH (c1:Comment),(c2:Comment)
	WHERE c1.parentCom_id = c2.id and NOT c1.parentCom_id = c1.id
	CREATE (c1)-[:repliesTo]->(c2)


## Lien Video-User

	MATCH (u:User),(v:Video)
	WHERE u.userId = v.channelId
	CREATE (v)-[:videoPublishedBy]->(u)

## Lien User-User

	MATCH (u1:User)-[:hasWritten]->(:Comment)-[:repliesTo]->(:Comment)<-[:hasWritten]-(u2:User)
	CREATE (u1)-[l:link]->(u2)
	SET l.Weight=1

	MATCH (u1:User)-[:hasWritten]->(:Comment)-[:commentToVideo]->(:Video)-[:videoPublishedBy]->(u2:User)
	CREATE (u1)-[l:link]->(u2)
	SET l.Weight=1

# Export du Graphe

## Export des users

	MATCH (u:User)
	RETURN u.userId as Id, u.userName as Label

## Export des liens

	MATCH (u1:User)-[l:link]->(u2:User)
	RETURN u1.userId as Source,u2.userId as Target,l.Weight as Weight