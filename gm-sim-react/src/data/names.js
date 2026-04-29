/**
 * names.js — Name pools keyed by nationality + global gamer tag pool.
 *
 * Each nationality in NAME_POOLS has a { first, last } pair of arrays.
 * The arrays are curated to reflect common/authentic names for that
 * country, with higher volume for the tier-1 nationalities that appear
 * most frequently in region pools.
 *
 * Tier-1 (30 first + 40 last each): US, KR, CN, BR, FR, GB, DE, JP, SE, ES
 * Tier-2 (15 first + 20 last each): CA, NL, PL, TR, RU, UA, MX, AR, PT, FI, DK, NO, VN, TH, PH, ID, AU, NZ, IT
 * Tier-3 (10 first + 15 last each): CL, PE, CO, MA, EG, SA, HK, TW, MY, SG
 *
 * Tags are global and nationality-agnostic — esports handles are abstract
 * in the real pro scene so it's more realistic to draw from a single pool.
 *
 * Backward-compat exports FIRST_NAMES and LAST_NAMES as flat unions for
 * any legacy code that hasn't migrated to nationality-aware generation.
 */

/* ─────────────── NAME POOLS ─────────────── */

export const NAME_POOLS = {
  // ═══════════ TIER 1 ═══════════

  US: {
    first: [
      'Alex', 'Austin', 'Brandon', 'Brian', 'Cole', 'Connor', 'Daniel', 'David',
      'Derek', 'Dylan', 'Ethan', 'Evan', 'Hunter', 'Jack', 'James', 'Jason',
      'Jordan', 'Kevin', 'Kyle', 'Logan', 'Mason', 'Michael', 'Nathan', 'Noah',
      'Owen', 'Ryan', 'Sean', 'Tanner', 'Tyler', 'Wyatt',
    ],
    last: [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson',
      'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin',
      'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Lewis', 'Walker', 'Hall',
      'Allen', 'Young', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green',
      'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell', 'Roberts', 'Phillips', 'Campbell',
    ],
  },

  KR: {
    first: [
      'Minjun', 'Seojun', 'Doyun', 'Jiho', 'Yunseo', 'Hajun', 'Junseo', 'Hyunwoo',
      'Jihoon', 'Donghyun', 'Sangwoo', 'Taeyang', 'Youngjae', 'Hoseok', 'Seokjin',
      'Jungkook', 'Jaemin', 'Hyeon', 'Woobin', 'Jinwoo', 'Chanyeol', 'Sungmin',
      'Jaehyun', 'Kyungsoo', 'Minseok', 'Byungho', 'Jaewon', 'Seunghyun', 'Dongwoo',
      'Hyunjin',
    ],
    last: [
      'Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon',
      'Jang', 'Lim', 'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang',
      'Ahn', 'Song', 'Ryu', 'Hong', 'Jeon', 'Go', 'Moon', 'Son',
      'Bae', 'Baek', 'Heo', 'Nam', 'Sim', 'Yoo', 'Ko', 'Noh',
      'Joo', 'Do', 'Gu', 'Min', 'Chun', 'Woo', 'Yang', 'Ha',
    ],
  },

  CN: {
    first: [
      'Wei', 'Lei', 'Yang', 'Jun', 'Hao', 'Ming', 'Bo', 'Qiang',
      'Chao', 'Peng', 'Kai', 'Yu', 'Jie', 'Tao', 'Xin', 'Lin',
      'Feng', 'Hong', 'Gang', 'Dong', 'Long', 'Zhen', 'Jian', 'Rui',
      'Shen', 'Zhi', 'Chen', 'Xiang', 'Zhao', 'Bin',
    ],
    last: [
      'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao',
      'Wu', 'Zhou', 'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo',
      'He', 'Gao', 'Lin', 'Luo', 'Zheng', 'Liang', 'Xie', 'Song',
      'Tang', 'Xu', 'Han', 'Feng', 'Deng', 'Cao', 'Peng', 'Zeng',
      'Xiao', 'Tian', 'Dong', 'Pan', 'Yuan', 'Cai', 'Jiang', 'Yu',
    ],
  },

  BR: {
    first: [
      'Gabriel', 'Lucas', 'Matheus', 'Pedro', 'Rafael', 'Thiago', 'Guilherme', 'Felipe',
      'Bruno', 'Leonardo', 'Rodrigo', 'Daniel', 'Caio', 'Vitor', 'Arthur', 'Gustavo',
      'Henrique', 'Eduardo', 'Murilo', 'Diego', 'Igor', 'Renan', 'Vinicius', 'Fernando',
      'Marcos', 'Ricardo', 'Andre', 'Jose', 'Paulo', 'Lucca',
    ],
    last: [
      'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida', 'Pereira',
      'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Araujo', 'Melo',
      'Barbosa', 'Rocha', 'Dias', 'Monteiro', 'Cardoso', 'Teixeira', 'Correia', 'Nascimento',
      'Moreira', 'Cavalcanti', 'Azevedo', 'Castro', 'Moraes', 'Pinto', 'Nunes', 'Mendes',
      'Machado', 'Freitas', 'Campos', 'Batista', 'Cruz', 'Cunha', 'Pires', 'Reis',
    ],
  },

  FR: {
    first: [
      'Lucas', 'Hugo', 'Louis', 'Nathan', 'Jules', 'Ethan', 'Arthur', 'Raphael',
      'Theo', 'Antoine', 'Paul', 'Leo', 'Maxime', 'Clement', 'Gabriel', 'Noah',
      'Enzo', 'Axel', 'Tom', 'Nolan', 'Mathis', 'Baptiste', 'Pierre', 'Thomas',
      'Romain', 'Julien', 'Victor', 'Alexandre', 'Mathieu', 'Quentin',
    ],
    last: [
      'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand',
      'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David',
      'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'Andre', 'Lefevre',
      'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'Francois', 'Martinez', 'Legrand', 'Garnier',
      'Faure', 'Rousseau', 'Blanc', 'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas',
    ],
  },

  GB: {
    first: [
      'Oliver', 'George', 'Harry', 'Jack', 'Jacob', 'Noah', 'Charlie', 'Muhammad',
      'Thomas', 'Oscar', 'William', 'James', 'Henry', 'Leo', 'Alfie', 'Joshua',
      'Freddie', 'Archie', 'Ethan', 'Isaac', 'Alexander', 'Joseph', 'Edward', 'Samuel',
      'Max', 'Logan', 'Daniel', 'Sebastian', 'Finley', 'Arthur',
    ],
    last: [
      'Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies',
      'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green',
      'Hall', 'Wood', 'Jackson', 'Clarke', 'Patel', 'Khan', 'Lewis', 'Harris',
      'Lee', 'Allen', 'Scott', 'Hill', 'Cook', 'Morris', 'Bailey', 'Mitchell',
      'Price', 'Cooper', 'Ward', 'Baker', 'Marshall', 'Kelly', 'Shaw', 'Knight',
    ],
  },

  DE: {
    first: [
      'Ben', 'Paul', 'Jonas', 'Leon', 'Finn', 'Noah', 'Elias', 'Luis',
      'Felix', 'Lukas', 'Maximilian', 'Moritz', 'Tim', 'Niklas', 'David', 'Julian',
      'Philipp', 'Jan', 'Sebastian', 'Tobias', 'Daniel', 'Fabian', 'Florian', 'Matthias',
      'Alexander', 'Stefan', 'Markus', 'Andreas', 'Kai', 'Sven',
    ],
    last: [
      'Muller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker',
      'Schulz', 'Hoffmann', 'Schafer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf',
      'Schroder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Kruger', 'Hofmann', 'Hartmann',
      'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier', 'Lehmann', 'Schmid',
      'Schulze', 'Maier', 'Kohler', 'Herrmann', 'Konig', 'Walter', 'Mayer', 'Huber',
    ],
  },

  JP: {
    first: [
      'Haruto', 'Yuto', 'Sota', 'Ren', 'Yuki', 'Hayato', 'Sho', 'Kaito',
      'Riku', 'Takumi', 'Tatsuya', 'Kenji', 'Takeshi', 'Daiki', 'Ryota', 'Shota',
      'Hiroki', 'Yusuke', 'Takahiro', 'Shinji', 'Hiroshi', 'Kenta', 'Naoki', 'Yuma',
      'Kazuki', 'Masaki', 'Ryu', 'Akira', 'Ryusei', 'Haru',
    ],
    last: [
      'Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura',
      'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Saito', 'Matsumoto',
      'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamazaki', 'Mori', 'Abe', 'Ikeda',
      'Hashimoto', 'Yamashita', 'Ishikawa', 'Nakajima', 'Maeda', 'Fujita', 'Ogawa', 'Goto',
      'Okada', 'Hasegawa', 'Murakami', 'Kondo', 'Ishii', 'Sakamoto', 'Endo', 'Aoki',
    ],
  },

  SE: {
    first: [
      'William', 'Oscar', 'Lucas', 'Elias', 'Hugo', 'Alexander', 'Oliver', 'Liam',
      'Axel', 'Leo', 'Filip', 'Viktor', 'Erik', 'Emil', 'Anton', 'Linus',
      'Noah', 'Isak', 'Adam', 'Gustav', 'Ludvig', 'Jakob', 'Oskar', 'Edvin',
      'Sixten', 'Olle', 'Hampus', 'Albin', 'Tage', 'Melvin',
    ],
    last: [
      'Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson',
      'Svensson', 'Gustafsson', 'Pettersson', 'Jonsson', 'Jansson', 'Hansson', 'Bengtsson', 'Jonsson',
      'Lindberg', 'Jakobsson', 'Magnusson', 'Lindstrom', 'Lindqvist', 'Lindgren', 'Berg', 'Axelsson',
      'Bergstrom', 'Lundberg', 'Lundgren', 'Lundqvist', 'Mattsson', 'Berglund', 'Fredriksson', 'Henriksson',
      'Sandberg', 'Forsberg', 'Sjoberg', 'Wallin', 'Engstrom', 'Eklund', 'Danielsson', 'Lund',
    ],
  },

  ES: {
    first: [
      'Hugo', 'Martin', 'Lucas', 'Mateo', 'Leo', 'Daniel', 'Alejandro', 'Pablo',
      'Manuel', 'Alvaro', 'Adrian', 'Enzo', 'David', 'Mario', 'Diego', 'Javier',
      'Marcos', 'Sergio', 'Miguel', 'Carlos', 'Antonio', 'Jose', 'Francisco', 'Rafael',
      'Alberto', 'Fernando', 'Gonzalo', 'Ivan', 'Raul', 'Ruben',
    ],
    last: [
      'Garcia', 'Rodriguez', 'Gonzalez', 'Fernandez', 'Lopez', 'Martinez', 'Sanchez', 'Perez',
      'Gomez', 'Martin', 'Jimenez', 'Ruiz', 'Hernandez', 'Diaz', 'Moreno', 'Alvarez',
      'Munoz', 'Romero', 'Alonso', 'Gutierrez', 'Navarro', 'Torres', 'Dominguez', 'Vazquez',
      'Ramos', 'Gil', 'Ramirez', 'Serrano', 'Blanco', 'Molina', 'Morales', 'Suarez',
      'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marin', 'Sanz', 'Iglesias',
    ],
  },

  // ═══════════ TIER 2 ═══════════

  CA: {
    first: [
      'Liam', 'Noah', 'Ethan', 'Lucas', 'William', 'Benjamin', 'Oliver', 'Logan',
      'Jacob', 'Jackson', 'Mason', 'Nathan', 'Owen', 'Carter', 'Connor',
    ],
    last: [
      'Smith', 'Brown', 'Tremblay', 'Martin', 'Roy', 'Gagnon', 'Lee', 'Wilson',
      'Johnson', 'MacDonald', 'Taylor', 'Campbell', 'Anderson', 'Thompson', 'White',
      'Lavoie', 'Bouchard', 'Gauthier', 'Morin', 'Pelletier',
    ],
  },

  NL: {
    first: [
      'Sem', 'Daan', 'Lucas', 'Milan', 'Levi', 'Finn', 'Luuk', 'Noah',
      'Jesse', 'Bram', 'Ruben', 'Teun', 'Thijs', 'Jens', 'Max',
    ],
    last: [
      'de Jong', 'Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Janssen', 'Visser',
      'Smit', 'Meijer', 'de Boer', 'Mulder', 'de Groot', 'Bos', 'Vos',
      'Peters', 'Hendriks', 'van Leeuwen', 'Dekker', 'Brouwer',
    ],
  },

  PL: {
    first: [
      'Jakub', 'Kacper', 'Antoni', 'Filip', 'Jan', 'Szymon', 'Franciszek', 'Michal',
      'Wojciech', 'Piotr', 'Mateusz', 'Tomasz', 'Adam', 'Pawel', 'Krzysztof',
    ],
    last: [
      'Nowak', 'Kowalski', 'Wisniewski', 'Wojcik', 'Kowalczyk', 'Kaminski', 'Lewandowski', 'Zielinski',
      'Szymanski', 'Wozniak', 'Dabrowski', 'Kozlowski', 'Jankowski', 'Mazur', 'Krawczyk',
      'Piotrowski', 'Grabowski', 'Nowakowski', 'Pawlowski', 'Michalski',
    ],
  },

  TR: {
    first: [
      'Yusuf', 'Berat', 'Omer', 'Emir', 'Mustafa', 'Ahmet', 'Mehmet', 'Ali',
      'Hasan', 'Huseyin', 'Ibrahim', 'Murat', 'Burak', 'Can', 'Emre',
    ],
    last: [
      'Yilmaz', 'Kaya', 'Demir', 'Celik', 'Sahin', 'Yildiz', 'Yildirim', 'Ozturk',
      'Aydin', 'Ozdemir', 'Arslan', 'Dogan', 'Kilic', 'Aslan', 'Cetin',
      'Kara', 'Koc', 'Kurt', 'Ozkan', 'Simsek',
    ],
  },

  RU: {
    first: [
      'Alexander', 'Maxim', 'Dmitri', 'Artyom', 'Daniil', 'Mikhail', 'Kirill', 'Andrei',
      'Ivan', 'Pavel', 'Roman', 'Sergei', 'Nikolai', 'Vladimir', 'Anton',
    ],
    last: [
      'Ivanov', 'Smirnov', 'Kuznetsov', 'Popov', 'Vasiliev', 'Petrov', 'Sokolov', 'Mikhailov',
      'Novikov', 'Fedorov', 'Morozov', 'Volkov', 'Alexeev', 'Lebedev', 'Semenov',
      'Egorov', 'Pavlov', 'Kozlov', 'Stepanov', 'Nikolaev',
    ],
  },

  UA: {
    first: [
      'Oleksandr', 'Bohdan', 'Maksym', 'Mykhailo', 'Danylo', 'Andrii', 'Artem', 'Nazar',
      'Dmytro', 'Yehor', 'Vladyslav', 'Serhii', 'Ivan', 'Oleh', 'Volodymyr',
    ],
    last: [
      'Shevchenko', 'Kovalenko', 'Bondarenko', 'Tkachenko', 'Kravchenko', 'Oliinyk', 'Shevchuk', 'Polishchuk',
      'Boiko', 'Savchenko', 'Melnyk', 'Moroz', 'Marchenko', 'Lysenko', 'Tkachuk',
      'Honcharenko', 'Kovalchuk', 'Pavlenko', 'Rudenko', 'Kravchuk',
    ],
  },

  MX: {
    first: [
      'Santiago', 'Mateo', 'Sebastian', 'Diego', 'Emiliano', 'Leonardo', 'Miguel', 'Daniel',
      'Luis', 'Jose', 'Carlos', 'Alejandro', 'Juan', 'Francisco', 'Eduardo',
    ],
    last: [
      'Hernandez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Rodriguez', 'Sanchez',
      'Ramirez', 'Cruz', 'Flores', 'Gomez', 'Torres', 'Rivera', 'Morales',
      'Jimenez', 'Reyes', 'Gutierrez', 'Ortiz', 'Chavez',
    ],
  },

  AR: {
    first: [
      'Mateo', 'Benjamin', 'Bautista', 'Thiago', 'Santino', 'Lautaro', 'Tomas', 'Valentino',
      'Joaquin', 'Nicolas', 'Ignacio', 'Agustin', 'Lucas', 'Juan', 'Franco',
    ],
    last: [
      'Gonzalez', 'Rodriguez', 'Gomez', 'Fernandez', 'Lopez', 'Diaz', 'Martinez', 'Perez',
      'Garcia', 'Sanchez', 'Romero', 'Sosa', 'Alvarez', 'Torres', 'Ruiz',
      'Ramirez', 'Flores', 'Acosta', 'Benitez', 'Medina',
    ],
  },

  PT: {
    first: [
      'Joao', 'Francisco', 'Afonso', 'Tomas', 'Duarte', 'Martim', 'Rodrigo', 'Santiago',
      'Miguel', 'Goncalo', 'Diogo', 'Pedro', 'Tiago', 'Guilherme', 'Andre',
    ],
    last: [
      'Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins',
      'Jesus', 'Sousa', 'Fernandes', 'Goncalves', 'Gomes', 'Lopes', 'Marques',
      'Alves', 'Almeida', 'Ribeiro', 'Pinto', 'Carvalho',
    ],
  },

  FI: {
    first: [
      'Eino', 'Oliver', 'Leo', 'Elias', 'Onni', 'Leevi', 'Niilo', 'Hugo',
      'Noel', 'Emil', 'Oskari', 'Arttu', 'Joel', 'Otto', 'Aaro',
    ],
    last: [
      'Korhonen', 'Virtanen', 'Makinen', 'Nieminen', 'Makela', 'Hamalainen', 'Laine', 'Heikkinen',
      'Koskinen', 'Jarvinen', 'Lehtonen', 'Lehtinen', 'Saarinen', 'Salminen', 'Heinonen',
      'Niemi', 'Heikkila', 'Kinnunen', 'Salonen', 'Turunen',
    ],
  },

  DK: {
    first: [
      'William', 'Noah', 'Oscar', 'Lucas', 'Emil', 'Oliver', 'Victor', 'Magnus',
      'Frederik', 'Aksel', 'Malthe', 'Valdemar', 'Anton', 'Elias', 'Mads',
    ],
    last: [
      'Nielsen', 'Jensen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sorensen',
      'Rasmussen', 'Jorgensen', 'Petersen', 'Madsen', 'Kristensen', 'Olsen', 'Thomsen',
      'Christiansen', 'Poulsen', 'Johansen', 'Moller', 'Mortensen',
    ],
  },

  NO: {
    first: [
      'Jakob', 'Emil', 'Lukas', 'Noah', 'Filip', 'Oliver', 'Aksel', 'Oskar',
      'William', 'Henrik', 'Elias', 'Magnus', 'Mathias', 'Isak', 'Kristian',
    ],
    last: [
      'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Nilsen', 'Kristiansen', 'Jensen',
      'Karlsen', 'Johnsen', 'Pettersen', 'Eriksen', 'Berg', 'Haugen', 'Hagen',
      'Johannessen', 'Andreassen', 'Jacobsen', 'Halvorsen', 'Dahl',
    ],
  },

  VN: {
    first: [
      'Minh', 'Anh', 'Hieu', 'Duc', 'Long', 'Khoa', 'Tuan', 'Huy',
      'Nam', 'Quang', 'Bao', 'Phuc', 'Khanh', 'Thanh', 'Duy',
    ],
    last: [
      'Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Huynh', 'Phan', 'Vu',
      'Vo', 'Dang', 'Bui', 'Do', 'Ho', 'Ngo', 'Duong',
      'Ly', 'Trinh', 'Dinh', 'Luong', 'Cao',
    ],
  },

  TH: {
    first: [
      'Somchai', 'Anan', 'Chaiya', 'Krit', 'Nattapong', 'Pichai', 'Prasit', 'Rattana',
      'Supachai', 'Thanawat', 'Wichai', 'Arthit', 'Chakrit', 'Niran', 'Wasan',
    ],
    last: [
      'Saetang', 'Sriwongse', 'Thongchai', 'Rattanakorn', 'Phongsawat', 'Suwannaphum', 'Chanthavy', 'Boonsong',
      'Suksan', 'Intaraporn', 'Wichitchai', 'Saengthong', 'Rungsi', 'Prasert', 'Thamrong',
      'Kaewsai', 'Chaiyaporn', 'Sutthisin', 'Phanthong', 'Wattana',
    ],
  },

  PH: {
    first: [
      'Jose', 'Angelo', 'Miguel', 'Joshua', 'Christian', 'John', 'Mark', 'Daniel',
      'Paolo', 'Carlo', 'Kyle', 'Gabriel', 'Rafael', 'Anton', 'Marco',
    ],
    last: [
      'dela Cruz', 'Reyes', 'Santos', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Ramos',
      'Gonzales', 'Cruz', 'Bautista', 'Villanueva', 'Castro', 'Aquino', 'Lim',
      'Rivera', 'Navarro', 'Pascual', 'Velasco', 'Morales',
    ],
  },

  ID: {
    first: [
      'Budi', 'Agus', 'Bambang', 'Dedi', 'Eko', 'Hendra', 'Rizky', 'Arif',
      'Andi', 'Dimas', 'Fajar', 'Galih', 'Joko', 'Wawan', 'Yusuf',
    ],
    last: [
      'Saputra', 'Setiawan', 'Pratama', 'Wijaya', 'Santoso', 'Hidayat', 'Nugroho', 'Kusuma',
      'Wibowo', 'Susanto', 'Rahman', 'Hakim', 'Suryanto', 'Firmansyah', 'Kurniawan',
      'Permana', 'Hartono', 'Sutrisno', 'Ramadhan', 'Maulana',
    ],
  },

  AU: {
    first: [
      'Jack', 'Oliver', 'Noah', 'William', 'Jackson', 'Thomas', 'Lachlan', 'James',
      'Lucas', 'Harrison', 'Cooper', 'Mason', 'Hunter', 'Henry', 'Riley',
    ],
    last: [
      'Smith', 'Jones', 'Williams', 'Brown', 'Taylor', 'Wilson', 'Johnson', 'White',
      'Martin', 'Anderson', 'Thompson', 'Walker', 'Lee', 'Harris', 'Clark',
      'Campbell', 'Robinson', 'Ryan', 'Kelly', 'King',
    ],
  },

  NZ: {
    first: [
      'Oliver', 'Jack', 'Noah', 'William', 'Lucas', 'James', 'Thomas', 'Liam',
      'Mason', 'Leo', 'Cooper', 'Henry', 'Max', 'Charlie', 'Ethan',
    ],
    last: [
      'Smith', 'Williams', 'Wilson', 'Brown', 'Taylor', 'Anderson', 'Jones', 'Wright',
      'Harris', 'Thompson', 'Walker', 'White', 'Martin', 'Clarke', 'Robinson',
      'Campbell', 'Green', 'Johnson', 'Hall', 'Scott',
    ],
  },

  IT: {
    first: [
      'Leonardo', 'Francesco', 'Alessandro', 'Lorenzo', 'Mattia', 'Andrea', 'Gabriele', 'Riccardo',
      'Tommaso', 'Edoardo', 'Giuseppe', 'Antonio', 'Matteo', 'Davide', 'Marco',
    ],
    last: [
      'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci',
      'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini',
      'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti',
    ],
  },

  // ═══════════ TIER 3 ═══════════

  CL: {
    first: [
      'Matias', 'Benjamin', 'Vicente', 'Martin', 'Maximiliano', 'Agustin', 'Sebastian', 'Joaquin',
      'Cristobal', 'Diego',
    ],
    last: [
      'Gonzalez', 'Munoz', 'Rojas', 'Diaz', 'Perez', 'Soto', 'Contreras', 'Silva',
      'Martinez', 'Lopez', 'Sepulveda', 'Morales', 'Araya', 'Fuentes', 'Espinoza',
    ],
  },

  PE: {
    first: [
      'Mateo', 'Santiago', 'Adrian', 'Diego', 'Sebastian', 'Joaquin', 'Gabriel', 'Alejandro',
      'Daniel', 'Leonardo',
    ],
    last: [
      'Quispe', 'Huaman', 'Mamani', 'Flores', 'Rojas', 'Garcia', 'Perez', 'Rodriguez',
      'Gonzales', 'Sanchez', 'Castillo', 'Ramos', 'Chavez', 'Vargas', 'Torres',
    ],
  },

  CO: {
    first: [
      'Santiago', 'Sebastian', 'Mateo', 'Nicolas', 'Martin', 'Samuel', 'Emiliano', 'Tomas',
      'Juan', 'Daniel',
    ],
    last: [
      'Rodriguez', 'Gomez', 'Gonzalez', 'Martinez', 'Lopez', 'Hernandez', 'Garcia', 'Sanchez',
      'Ramirez', 'Torres', 'Flores', 'Diaz', 'Vargas', 'Castro', 'Ortiz',
    ],
  },

  MA: {
    first: [
      'Mohamed', 'Yassine', 'Adam', 'Rayan', 'Ayoub', 'Anas', 'Omar', 'Karim',
      'Hamza', 'Youssef',
    ],
    last: [
      'El Amrani', 'Benali', 'Alaoui', 'Bennani', 'Tazi', 'Fassi', 'Idrissi', 'Chraibi',
      'Berrada', 'Lahlou', 'Sebti', 'Benjelloun', 'El Fassi', 'Cherkaoui', 'Bennis',
    ],
  },

  EG: {
    first: [
      'Ahmed', 'Mohamed', 'Omar', 'Youssef', 'Ali', 'Mahmoud', 'Karim', 'Amr',
      'Hassan', 'Khaled',
    ],
    last: [
      'Mohamed', 'Ahmed', 'Ali', 'Hassan', 'Mahmoud', 'Ibrahim', 'Abdelrahman', 'Said',
      'Sayed', 'Farouk', 'Mostafa', 'Salah', 'Shahin', 'Fouad', 'Nasser',
    ],
  },

  SA: {
    first: [
      'Abdullah', 'Mohammed', 'Abdulrahman', 'Faisal', 'Khalid', 'Saud', 'Fahad', 'Turki',
      'Nawaf', 'Bandar',
    ],
    last: [
      'Al Saud', 'Al Qahtani', 'Al Ghamdi', 'Al Harbi', 'Al Shehri', 'Al Otaibi', 'Al Zahrani', 'Al Dosari',
      'Al Mutairi', 'Al Anazi', 'Al Ahmari', 'Al Maliki', 'Al Rashid', 'Al Subaie', 'Al Juhani',
    ],
  },

  HK: {
    first: [
      'Chun', 'Ho', 'Ka', 'Kai', 'Wai', 'Chi', 'Kwok', 'Yu',
      'Siu', 'Lok',
    ],
    last: [
      'Chan', 'Wong', 'Lee', 'Cheung', 'Lau', 'Chow', 'Ng', 'Ho',
      'Leung', 'Yip', 'Tsang', 'Fung', 'Tam', 'Lam', 'Yuen',
    ],
  },

  TW: {
    first: [
      'Chia', 'Cheng', 'Wei', 'Yu', 'Hao', 'Kai', 'Jun', 'Chieh',
      'Hsiang', 'Ming',
    ],
    last: [
      'Chen', 'Lin', 'Huang', 'Chang', 'Li', 'Wang', 'Wu', 'Liu',
      'Tsai', 'Yang', 'Hsu', 'Lin', 'Chiu', 'Kuo', 'Chou',
    ],
  },

  MY: {
    first: [
      'Ahmad', 'Muhammad', 'Aiman', 'Haikal', 'Danial', 'Afiq', 'Iqbal', 'Syafiq',
      'Amirul', 'Zulkifli',
    ],
    last: [
      'Abdullah', 'Ibrahim', 'Hassan', 'Hussain', 'Ismail', 'Rahman', 'Yusof', 'Omar',
      'Ali', 'Othman', 'Mohamed', 'Ahmad', 'Salleh', 'Razak', 'Zainuddin',
    ],
  },

  SG: {
    first: [
      'Jun', 'Wei', 'Zhi', 'Kai', 'Hong', 'Ming', 'Jie', 'Yong',
      'Xuan', 'Rui',
    ],
    last: [
      'Tan', 'Lim', 'Lee', 'Ng', 'Ong', 'Wong', 'Goh', 'Chua',
      'Koh', 'Teo', 'Chan', 'Yeo', 'Sim', 'Ho', 'Low',
    ],
  },
};

/* ─────────────── Backward-compat flat exports ─────────────── */

/**
 * Flat union of all first names across all pools. Kept for any legacy
 * callers that haven't migrated to nationality-aware generation. New
 * code should use NAME_POOLS[nationality].first instead.
 */
export const FIRST_NAMES = Object.values(NAME_POOLS).flatMap(p => p.first);

/**
 * Flat union of all last names across all pools. Same rationale as FIRST_NAMES.
 */
export const LAST_NAMES = Object.values(NAME_POOLS).flatMap(p => p.last);

/**
 * Get the name pool for a given nationality. Falls back to US if the
 * nationality code isn't recognized — this handles edge cases where a
 * player might carry a nationality code we didn't add a pool for.
 */
export function getNamePool(nationality) {
  return NAME_POOLS[nationality] || NAME_POOLS.US;
}

/* ─────────────── Gamer tags (global pool, nationality-agnostic) ─────────────── */

export const TAGS = [
  // Core tags
  'Ace', 'Apex', 'Blitz', 'Bolt', 'Crisp', 'Crypt', 'Dash', 'Drift',
  'Echo', 'Ember', 'Flux', 'Frost', 'Ghost', 'Glitch', 'Havoc', 'Hex',
  'Ion', 'Iron', 'Jet', 'Jinx', 'Karma', 'Kayo', 'Lynx', 'Lux',
  'Mako', 'Mist', 'Neon', 'Nexus', 'Omega', 'Onyx', 'Phantom', 'Pulse',
  'Razor', 'Rift', 'Shade', 'Surge', 'Thorn', 'Titan', 'Ultra', 'Vex',
  'Void', 'Warp', 'Xeno', 'Zephyr',
  // Extended base
  'Ash', 'Atlas', 'Axle', 'Bane', 'Blade', 'Blaze', 'Brew', 'Brink',
  'Byte', 'Cage', 'Chill', 'Cipher', 'Clash', 'Comet', 'Core', 'Crow',
  'Dagger', 'Dawn', 'Daze', 'Doom', 'Drake', 'Drip', 'Dusk', 'Edge',
  'Fang', 'Flare', 'Forge', 'Fuse', 'Gale', 'Grim', 'Grove', 'Haste',
  'Hawk', 'Haze', 'Helix', 'Hydra', 'Inferno', 'Jolt', 'Judge', 'Kite',
  'Knox', 'Lance', 'Laser', 'Latch', 'Lunar', 'Mars', 'Maze', 'Merit',
  'Monk', 'Morph', 'Nerve', 'Nuke', 'Orbit', 'Oxide', 'Pax', 'Peak',
  'Pike', 'Prism', 'Prowl', 'Pyro', 'Quake', 'Raid', 'Raven', 'Reign',
  'Rex', 'Riot', 'Rogue', 'Rush', 'Sage', 'Scar', 'Scout', 'Shard',
  'Siege', 'Slate', 'Snare', 'Sonic', 'Spark', 'Spike', 'Steel', 'Storm',
  'Swift', 'Tact', 'Talon', 'Tank', 'Trace', 'Valor', 'Venom', 'Vigor',
  'Volt', 'Ward', 'Wraith', 'Wrath', 'Zenith', 'Zero', 'Zone',
  // Nature / elements
  'Aero', 'Aqua', 'Aura', 'Bliss', 'Brook', 'Cedar', 'Clay', 'Cloud',
  'Coral', 'Crest', 'Delta', 'Fern', 'Fjord', 'Glen', 'Harbor',
  'Haven', 'Isle', 'Ivy', 'Jade', 'Lake', 'Lotus', 'Maple', 'Marsh',
  'Mesa', 'Nova', 'Oak', 'Opal', 'Pearl', 'Pine', 'Reef', 'Ridge',
  'River', 'Rock', 'Sand', 'Sky', 'Snow', 'Stone', 'Tide',
  'Vale', 'Wave', 'Wisp', 'Wren',
  // Tech / cyber
  'Andro', 'Arc', 'Bit', 'Bug', 'Cache', 'Chip', 'Click', 'Code',
  'Cog', 'Ctrl', 'Data', 'Debug', 'Dev', 'Diode', 'Dock', 'Drive',
  'Exec', 'Fiber', 'Frag', 'Freq', 'Gain', 'Gate', 'Grid', 'Hash',
  'Hub', 'Input', 'Java', 'Kern', 'Key', 'Link', 'Log', 'Loop',
  'Macro', 'Mode', 'Net', 'Node', 'Null', 'Opt', 'Patch', 'Ping',
  'Port', 'Proxy', 'Query', 'Ram', 'Root', 'Scan', 'Shell', 'Sync',
  'Tag', 'Tick', 'Token', 'Unix', 'Vent', 'Vim', 'Web', 'Wire',
  // Aggressive / combat
  'Anvil', 'Arrow', 'Bash', 'Bear', 'Bite', 'Blast', 'Brawl', 'Brute',
  'Bullet', 'Burner', 'Cannon', 'Chain', 'Charge', 'Chomp', 'Claw', 'Cobra',
  'Crash', 'Crush', 'Cuda', 'Decoy', 'Eagle', 'Feral', 'Fury', 'Gator',
  'Gorge', 'Grip', 'Guard', 'Gunner', 'Hammer', 'Hound', 'Hunt', 'Impact',
  'Jaguar', 'Lion', 'Mace', 'Mauler', 'Orca', 'Panther', 'Raptor',
  'Reaper', 'Rhino', 'Sabre', 'Scorch', 'Shark', 'Snipe', 'Sting', 'Strike',
  'Tazer', 'Viper', 'Wolf', 'Yak',
  // Leetspeak variants
  'Ac3', 'Bl1tz', 'Cr1sp', 'D4sh', 'Ech0', 'Fr0st', 'Gh0st', 'H3x',
  'J1nx', 'K4rm4', 'N30n', '0nyx', 'Ph4nt0m', 'Puls3', 'R4z0r', 'Sh4de',
  'Th0rn', 'T1t4n', 'V01d', 'Z3r0', 'Z0ne', 'Bl4ze', 'F4ng', 'Fl4re',
  'Sp1ke', 'St33l', 'St0rm', 'Sw1ft', 'Tr4ce', 'V0lt', 'Wr41th',
  'N3rv3', 'Hydr4', 'R0gu3', 'Sl4te', 'Sc0ut', 'Pr1sm', 'S0nic',
  'Pyro0', 'C0r3', 'Sn1pe', 'Cr4sh', 'Gr1p', 'H4wk', 'M4rs',
];
