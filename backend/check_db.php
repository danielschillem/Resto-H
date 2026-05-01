<?php
$db = new PDO('sqlite:C:/Users/DEVBACKEND/Desktop/Resto-app/backend/database/database.sqlite');

// Structure de la table
$cols = $db->query('PRAGMA table_info(formations_sanitaires)')->fetchAll(PDO::FETCH_ASSOC);
echo "=== colonnes formations_sanitaires ===\n";
foreach($cols as $c) echo $c['name'].' ('.$c['type'].')'."\n";

echo "\n=== formations_sanitaires (toutes colonnes) ===\n";
foreach($db->query('SELECT * FROM formations_sanitaires')->fetchAll(PDO::FETCH_ASSOC) as $r) {
    echo implode(' | ', array_map(fn($k,$v)=>"$k=$v", array_keys($r), $r))."\n";
}

echo "\n=== users ===\n";
foreach($db->query('SELECT id, name, email, role, formation_sanitaire_id FROM users')->fetchAll(PDO::FETCH_ASSOC) as $r) {
    echo $r['id'].' | '.$r['role'].' | '.$r['email'].' | formation='.$r['formation_sanitaire_id']."\n";
}
