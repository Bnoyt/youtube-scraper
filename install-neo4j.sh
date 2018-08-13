tar -xf neo4j-community-3.4.5-unix.tar.gz -C dashboard/
mv dashboard/neo4j-community-3.4.5 dashboard/neo4j
rm dashboard/neo4j/conf/neo4j.conf
cp neo4j.conf dashboard/neo4j/conf/
./dashboard/neo4j/bin/neo4j start