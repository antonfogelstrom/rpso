package handler

import (
	"math/rand"
	"strconv"
	"strings"
	"time"
)

var (
	adjectives = []string{
		"Swift", "Bold", "Calm", "Dark", "Epic",
		"Fast", "Grand", "Holy", "Iron", "Jade",
		"Keen", "Lunar", "Mild", "Noble", "Onyx",
		"Pure", "Quiet", "Rapid", "Sharp", "Turbo",
		"Ultra", "Vivid", "Wild", "Zeal", "Brave",
		"Crisp", "Dusk", "Elite", "Frost", "Grim",
		"Haute", "Infer", "Jolly", "Kinetic", "Lucky",
		"Mythic", "Neon", "Omega", "Pixel", "Quest",
		"Royal", "Solar", "Tough", "Urban", "Valor",
		"Wise", "Xeno", "Young", "Zest",
	}

	animals = []string{
		"Lion", "Tiger", "Elephant", "Giraffe", "Cheetah", 
		"Leopard", "Jaguar", "SnowLeopard", "CloudedLeopard", "BlackPanther",
		"Wolf", "Fox", "Coyote", "Jackal", "Dingo", 
		"GrizzlyBear", "PolarBear", "BlackBear", "Panda", "SlothBear",
		"Kangaroo", "Koala", "Wombat", "Wallaby", "TasmanianDevil",
		"Platypus", "Echidna", "Opossum", "SugarGlider", "Bandicoot",
		"Chimpanzee", "Gorilla", "Orangutan", "Gibbon", "Lemur",
		"Dolphin", "Orca", "BlueWhale", "HumpbackWhale", "BelugaWhale",
		"Narwhal", "Manatee", "Dugong", "SeaOtter",
		"Eagle", "Falcon", "Hawk", "Owl", "Ostrich",
		"Emus", "Penguin", "Flamingo", "Peacock", "Toucan",
		"Chameleon", "KomodoDragon", "BeardedDragon", "Gecko", "Iguana",
		"Alligator", "Crocodile", "Caiman", "Gharial", "LeatherbackTurtle",
		"Salmon", "Clownfish", "HammerheadShark", "MantaRay",
		"Octopus", "Squid", "Cuttlefish", "Nautilus", "Jellyfish",
		"Dragon", "Phoenix", "Griffin", "Pegasus", "Unicorn",
		"Cerberus", "Hydra", "Chimera", "Minotaur", "Centaur",
		"Kraken", "Leviathan", "Hippogriff", "Thunderbird", "Basilisk",
		"Goblin", "Orc", "Troll", "Gargoyle", "Sphinx",
		"Manticore", "Wyvern", "Yeti", "Sasquatch", "Chupacabra",
	}
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

func generateUsername() string {
	adj := adjectives[rand.Intn(len(adjectives))]
	animal := animals[rand.Intn(len(animals))]
	num := rand.Intn(1000000)
	return strings.Join([]string{adj, animal, strconv.Itoa(num)}, "")
}
