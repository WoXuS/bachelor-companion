import {createHash} from 'node:crypto'

export const GROOM_NAME = 'Antoni'
export const BEST_MAN_NAME = 'Borys'
export const BRIDE_NAME = 'Nina'

export const STARTING_BALANCE = 100
export const PHYSICAL_EGG_COUNT = 15
export const PHYSICAL_EGG_NUMBER_OFFSET = 100

const EGG_CODE_NAMESPACE = 'EASTER_EGG_NAMESPACE_v1'

export function codeForEgg(num: number, type: 'PHYSICAL' | 'VIRTUAL', len = 7) {
    const digest = createHash('sha256')
        .update(`${EGG_CODE_NAMESPACE}:${type}:${num}`, 'utf8')
        .digest('hex')
    const body = BigInt(`0x${digest.slice(0, 10)}`).toString(36).toUpperCase().slice(0, len)
    return `${type === 'PHYSICAL' ? 'P' : 'V'}-${body}`
}

export const participantNames = [
    'Antoni', 'Borys', 'Cezary', 'Damian', 'Emil', 'Filip',
    'Gabriel', 'Henryk', 'Igor', 'Julian', 'Konrad', 'Leon',
]

export const participants = participantNames.map((name) => ({
    name,
    avatarUrl: `/images/participants/${name.toLowerCase()}.png`,
    balance: STARTING_BALANCE,
}))

export const virtualEggs = [
    {number: 1, label: 'Jajo dla czytających cennik do końca', placementKey: 'shop'},
    {number: 2, label: 'Jajo ukryte w rankingu', placementKey: 'ranking-first'},
    {number: 3, label: 'Jajo dla przeglądających ranking do końca', placementKey: 'ranking-last'},
    {number: 4, label: 'Jajo dla grzebiących na stronie', placementKey: 'admin-page'},
    {number: 5, label: 'Jajo dla bardzo grzebiących na stronie', placementKey: 'admin-page-2'},
    {number: 6, label: 'Jajo dla czytających zasady do końca', placementKey: 'how-to-earn'},
    {number: 7, label: 'Jajo dla eksploratora pojedynków', placementKey: 'duels'},
    {number: 8, label: 'Jajo dla przeglądających drabinkę przegranych', placementKey: 'losers'},
]

export const shopItems = [
    {key: 'give-shot', label: 'Każ komuś wypić shota', cost: 50, category: 'troll'},
    {key: 'swimming-goggles', label: 'Okulary do pływania przez 10 minut', cost: 100, category: 'troll'},
    {key: 'jump-lake', label: 'Każ komuś zanurzyć głowę w jeziorze', cost: 200, category: 'troll'},
    {key: 'switch-opponent', label: 'Zmień komuś przeciwnika w meczu', cost: 100, category: 'troll'},
    {key: 'left-hand', label: 'Lewa ręka – kara w następnym meczu', cost: 150, category: 'troll'},
    {key: 'immunity', label: 'Immunitet (nikt Ci nie przeszkadza do końca mini-gry)', cost: 150, category: 'buff'},
    {key: 'double-points-4', label: 'Double Points (4 kolejne mecze turniejowe)', cost: 170, category: 'buff'},
    {key: 'change-opponent', label: 'Zmień sobie przeciwnika w meczu', cost: 100, category: 'buff'},
]

export const prizes = [
    {place: 1, title: 'Koszulka wyjazdowa', description: 'Customowa koszulka przygotowana na wyjazd'},
    {place: 2, title: 'Czapka wyjazdowa', description: 'Czapka jako zestaw pocieszenia'},
    {place: 3, title: 'Symboliczna nagroda', description: 'Niespodzianka od ekipy'},
]

export const audienceQuestions = [
    `Kim ${GROOM_NAME} chciał być jak był mały?`,
    `Jaki ${GROOM_NAME} ma rozmiar buta?`,
    `Jaki był najbardziej impulsywny zakup ${GROOM_NAME}ego?`,
    `Jakie jest ulubione śniadanie ${GROOM_NAME}ego?`,
    `Jakie są wymarzone wakacje ${GROOM_NAME}ego?`,
    `Jaki jest ulubiony film ${GROOM_NAME}ego?`,
    `Jaka jest ulubiona bajka z dzieciństwa ${GROOM_NAME}ego?`,
    `Jaki jest ulubiony kolor ${GROOM_NAME}ego?`,
    `Jaką supermoc wybrałby ${GROOM_NAME}?`,
    `Jaki jest wymarzony samochód ${GROOM_NAME}ego?`,
    `Jaki jest ulubiony sport ${GROOM_NAME}ego?`,
]

export const groomQuestions = [
    `Jaka jest ulubiona piosenka ${BRIDE_NAME}?`,
    `Jakie są ulubione kwiaty ${BRIDE_NAME}?`,
    'Gdzie była wasza pierwsza randka?',
    `Jaka jest ulubiona potrawa ${BRIDE_NAME}?`,
    `Co ${BRIDE_NAME} kolekcjonowała w dzieciństwie?`,
    `Jaka jest ulubiona bajka Disneya ${BRIDE_NAME}?`,
    `Jaki jest ulubiony serial ${BRIDE_NAME}?`,
    'Jaki daliście sobie prezent na pierwszą rocznicę?',
    `Kim ${BRIDE_NAME} chciała zostać jako dziecko?`,
    `Jaki jest wymarzony kierunek podróży ${BRIDE_NAME}?`,
    `Jaka jest ulubiona pora roku ${BRIDE_NAME}?`,
    'W którym mieście się poznaliście?',
]
