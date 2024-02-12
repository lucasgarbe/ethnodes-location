package main

import (
	"database/sql"
	"encoding/json"
	"net"
	"os"

	"github.com/oschwald/maxminddb-golang"
	_ "modernc.org/sqlite"
)

type CrawledNode struct {
	ID              string
	IP				string
	Now             string
	ClientType      string
	NetworkID       uint64
	Country         string
	City			string
	Coordinates		string
	LastSeen		string
	FirstSeen		string
}

type Location struct {
	AccuracyRadius uint16 `maxminddb:"accuracy_radius"`
	Latitude float64 `maxminddb:"latitude"`
	Longitude float64 `maxminddb:"longitude"`
	TimeZone string `maxminddb:"time_zone"`
}

type Node struct {
	IP			string `json:"ip"`
	ASN			string `json:"asn"`
	Country		string `json:"country"`
	Location	Location `json:"location"`
}

func main() {
	db, err := sql.Open("sqlite", "crawler.db")
	if err != nil {
		panic(err)
	}

	defer db.Close()

	geodb, err := maxminddb.Open("GeoLite2-City.mmdb")
	if err != nil {
		panic(err)
	}
	defer geodb.Close()

	asndb, err := maxminddb.Open("GeoLite2-ASN.mmdb")
	if err != nil {
		panic(err)
	}
	defer asndb.Close()

	stmt, err := db.Prepare("SELECT ID, IP, Now, ClientType, NetworkID, Country, City, Coordinates, LastSeen, FirstSeen FROM nodes")
	rows, err := stmt.Query()
	
	nodes := make([]Node, 0)
	for rows.Next() {
		var node CrawledNode
		err = rows.Scan(
			&node.ID,
			&node.IP,
			&node.Now,
			&node.ClientType,
			&node.NetworkID,
			&node.Country,
			&node.City,
			&node.Coordinates,
			&node.LastSeen,
			&node.FirstSeen)


		var georecord struct {
			Country struct {
				ISOCode string `maxminddb:"iso_code"`
			} `maxminddb:"country"`
			Location Location `maxminddb:"location"`
		}

		ip := net.ParseIP(node.IP)
		err = geodb.Lookup(ip, &georecord)
		if err != nil {
			panic(err)
		}

		var asnrecord any
		err = asndb.Lookup(ip, &asnrecord)
		if err != nil {
			panic(err)
		}

		asn := asnrecord.(map[string]interface{})["autonomous_system_organization"].(string)

		nodes = append(nodes, Node{node.IP, asn, georecord.Country.ISOCode, georecord.Location})
	}

	nodesF, err := os.Create("html/nodes.json")

	// write nodes as json to node.json file
	err = json.NewEncoder(nodesF).Encode(nodes)
	if err != nil {
		panic(err)
	}

	err = nodesF.Close()
	if err != nil {
		panic(err)
	}
}

