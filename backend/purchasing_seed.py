"""식재료 주문 기본 데이터 (처음 한 번만 DB에 들어간다. 이후 목록은 화면에서 추가/삭제한다)."""

VENDORS = ["US Foods", "Sysco", "PFG", "R J Neese", "Best Supply", "Restaurant Depot"]

# (이름, 분류, 포장 규격, 구매처, 구매처 상품코드)
_USF = "US Foods"
_RD = "Restaurant Depot"
_RJN = "R J Neese"

# US Foods 목록 (Claudia 의 US Foods 주문 리스트 기준)
ITEMS = [
    # Beef / Meat
    ("Ground Beef 81/19 (Chub)", "Beef", "4/10 lb", _USF, "5996541"),
    ("Philly Steak Flat 4 oz", "Beef", "40/4 oz", _USF, "4558003"),
    ("Philly Steak Seasoned 5 oz", "Beef", "32/5 oz", _USF, "4221768"),
    ("Hot Dog All-Beef 5:1", "Processed Meat", "10 lb", _USF, "4328910"),
    ("Hot Dog Chili Sauce", "Grocery Ref/Frozen", "7 lb", _USF, "2391688"),
    # Frozen / Appetizers
    ("Onion Rings Battered", "Frozen", "4/2.5 lb", _USF, "1162680"),
    # Dairy
    ("Ice Cream Chocolate", "Dairy", "3 gal", _USF, "766949"),
    ("Ice Cream Cookies & Cream", "Dairy", "3 gal", _USF, "904029"),
    ("Ice Cream Strawberry", "Dairy", "3 gal", _USF, "766931"),
    ("Ice Cream Vanilla", "Dairy", "3 gal", _USF, "766964"),
    # Beverage
    ("Coke Zero Syrup (BIB)", "Beverage", "5 gal", _USF, "382804"),
    ("Coke Classic Syrup (BIB)", "Beverage", "5 gal", _USF, "9004367"),
    ("Diet Coke Syrup (BIB)", "Beverage", "5 gal", _USF, "5004361"),
    ("Sprite Syrup (BIB)", "Beverage", "5 gal", _USF, "4004362"),
    ("Minute Maid Lemonade Syrup (BIB)", "Beverage", "5 gal", _USF, "9239823"),
    ("Mr. Pibb Syrup (BIB)", "Beverage", "5 gal", _USF, "1325365"),
    ("Monin Vanilla Syrup", "Beverage", "4/1 L", _USF, "2424273"),
    # Disposables
    ("Carry-Out Bag 12 lb Kraft", "Disposables", "500 ea", _USF, "738948"),
    ("Foam Container Hot Dog 7.25x3", "Disposables", "6/84 ea", _USF, "3569589"),
    ("Foam Container 9x9 1-Cmpt", "Disposables", "150 ea", _USF, "7804644"),
    ("Foam Cup 16 oz", "Disposables", "20/25 ea", _USF, "763300"),
    ("Foam Cup 20 oz (Dart Tall)", "Disposables", "20/25 ea", _USF, "6005227"),
    ("Foam Cup 20 oz (Monogram)", "Disposables", "25/20 ea", _USF, "763326"),
    ("Cup Lid 12-24 oz Straw Slotted", "Disposables", "10/100 ea", _USF, "4002044"),
    ("Trash Liner 60 gal", "Disposables", "100 ea", _USF, "5329420"),
    ("Bamboo Pick 4.5\"", "Disposables", "12/100 ea", _USF, "6202201"),
    ("Straw Jumbo 7.75\" Wrapped", "Disposables", "10/500 ea", _USF, "9855909"),
    ("Paper Towel Multifold 9.5x9", "Disposables", "16/250 ea", _USF, "8609075"),
    # Dry grocery
    ("Ranch Dressing Pouch 1.5 oz", "Grocery Dry", "60/1.5 oz", _USF, "4952149"),
    ("Ranch Dressing Pouch 12 g", "Grocery Dry", "200/12 g", _USF, "4010507"),
    ("Ketchup Pouch", "Grocery Dry", "6/114 oz", _USF, "190025"),
    ("Mayonnaise Extra-Heavy", "Grocery Dry", "4/1 gal", _USF, "7329113"),
    ("Mustard Yellow", "Grocery Dry", "4/1 gal", _USF, "4364063"),
    ("Pickle Dill Crinkle Chips", "Grocery Dry", "5 gal", _USF, "6199833"),
    ("Salt Packets 0.5 g", "Grocery Dry", "6/1000 ea", _USF, "5358825"),
    ("Chipotle Aioli Squeeze", "Grocery Dry", "6/18 oz", _USF, "1180616"),
    ("Cheddar Cheese Sauce", "Grocery Dry", "4/140 oz", _USF, "3216298"),
    ("Texas Pete Hot Sauce", "Grocery Dry", "24/6 oz", _USF, "4083655"),
    ("A1 Steak Sauce Packets", "Grocery Dry", "200/0.5 oz", _USF, "3148780"),
    ("Fry Shortening (Liquid)", "Oils", "35 lb", _USF, "1328699"),
    # Produce
    ("Potato Russet 50 ct", "Produce", "50 lb", _USF, "3326709"),
    ("Tomato Round 4x5", "Produce", "20 lb", _USF, "5749936"),
    # Restaurant Depot (주로 여기서 구매)
    ("Liquid Butter", "Dairy", "", _RD, ""),
    ("Bacon", "Beef & Pork", "", _RD, ""),
    ("American Cheese", "Dairy", "", _RD, ""),
    ("Cabbage", "Produce", "", _RD, ""),
    ("Onion", "Produce", "", _RD, ""),
    ("Napkin Paper", "Disposables", "", _RD, ""),
    ("Sugar", "Grocery Dry", "", _RD, ""),
    # R J Neese (빵)
    ("Large Buns", "Bread", "", _RJN, ""),
    ("Small Buns", "Bread", "", _RJN, ""),
    ("Hotdog Buns", "Bread", "", _RJN, ""),
    ("Wheat Bread", "Bread", "", _RJN, ""),
    ("White Bread", "Bread", "", _RJN, ""),
]

# 두 구매처에서 모두 살 수 있어 가격 비교 대상이 되는 품목 (이름, 기본 구매처, [(구매처, 상품코드, 메모)...])
# Lettuce: US Foods 버거용 상추 백(2/5 lb)과 Restaurant Depot 상추를 한 품목으로 묶어 비교한다.
SHARED_ITEMS = [
    ("Lettuce", "Produce", "", _RD, [(_USF, "7779093", "2/5 lb bag (burger topper)"), (_RD, "", "")]),
]
