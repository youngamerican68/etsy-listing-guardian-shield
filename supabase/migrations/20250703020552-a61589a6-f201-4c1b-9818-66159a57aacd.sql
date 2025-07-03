-- Add comprehensive compliance rules for major platforms
INSERT INTO public.compliance_rules (term, risk_level, reason) VALUES
-- High-risk trademark violations
('nike', 'high', 'Nike is a protected trademark - use may result in copyright infringement'),
('adidas', 'high', 'Adidas is a protected trademark - use may result in copyright infringement'),
('gucci', 'high', 'Gucci is a protected trademark - use may result in copyright infringement'),
('louis vuitton', 'high', 'Louis Vuitton is a protected trademark - use may result in copyright infringement'),
('chanel', 'high', 'Chanel is a protected trademark - use may result in copyright infringement'),
('rolex', 'high', 'Rolex is a protected trademark - use may result in copyright infringement'),
('apple', 'high', 'Apple is a protected trademark - use may result in copyright infringement'),
('samsung', 'high', 'Samsung is a protected trademark - use may result in copyright infringement'),
('disney', 'high', 'Disney is a protected trademark - use may result in copyright infringement'),
('marvel', 'high', 'Marvel is a protected trademark - use may result in copyright infringement'),
('pokemon', 'high', 'Pokemon is a protected trademark - use may result in copyright infringement'),
('nintendo', 'high', 'Nintendo is a protected trademark - use may result in copyright infringement'),

-- Platform-specific prohibited terms
('replica', 'high', 'Replica items violate authenticity policies on most platforms'),
('counterfeit', 'high', 'Counterfeit items are prohibited on all platforms'),
('fake', 'high', 'Fake items violate authenticity policies'),
('bootleg', 'high', 'Bootleg items are prohibited intellectual property violations'),
('knock-off', 'high', 'Knock-off items violate authenticity policies'),

-- Warning-level terms that need attention
('inspired by', 'warning', 'May imply trademark infringement - be careful with brand references'),
('style', 'warning', 'When used with brand names, may imply unauthorized copying'),
('similar to', 'warning', 'May imply trademark infringement when referencing brands'),
('like', 'warning', 'When used with brand names in listings, may imply unauthorized copying'),
('designer', 'warning', 'Be careful not to misrepresent non-designer items as designer'),
('authentic', 'warning', 'Claims of authenticity require proper verification'),
('genuine', 'warning', 'Claims of authenticity require proper verification'),
('original', 'warning', 'May be misused to imply brand authorization'),

-- Etsy-specific concerns
('vintage' , 'warning', 'Etsy vintage items must be 20+ years old - verify age claims'),
('handmade', 'warning', 'Etsy handmade items must be made by seller - verify crafting claims'),
('supplies', 'warning', 'Etsy craft supplies must be genuine crafting materials'),

-- Amazon-specific concerns
('best seller', 'warning', 'Amazon prohibits false bestseller claims without verification'),
('amazon choice', 'warning', 'Cannot claim Amazon Choice status falsely'),
('prime', 'warning', 'Cannot falsely reference Prime shipping without eligibility'),

-- eBay-specific concerns
('new with tags', 'warning', 'eBay requires accurate condition descriptions with proof'),
('factory sealed', 'warning', 'eBay requires accurate condition descriptions with proof'),
('mint condition', 'warning', 'eBay requires accurate condition descriptions'),

-- General marketplace warnings
('limited edition', 'warning', 'Verify limited edition claims are accurate'),
('rare', 'warning', 'Verify rarity claims to avoid misleading buyers'),
('exclusive', 'warning', 'Verify exclusivity claims are accurate'),
('one of a kind', 'warning', 'Verify uniqueness claims are accurate'),
('collectors item', 'warning', 'Verify collectible status and value claims'),

-- Medical/health claims (high risk)
('cure', 'high', 'Medical claims require FDA approval and proper licensing'),
('heal', 'high', 'Medical claims require FDA approval and proper licensing'),
('treatment', 'high', 'Medical claims require FDA approval and proper licensing'),
('therapeutic', 'high', 'Medical claims require FDA approval and proper licensing'),
('medicine', 'high', 'Medical products require proper licensing and compliance'),

-- Adult content indicators
('adult', 'warning', 'Adult content has special restrictions on most platforms'),
('mature', 'warning', 'Mature content may have platform restrictions'),
('18+', 'warning', 'Age-restricted content has special platform requirements'),

-- Weapons and restricted items
('weapon', 'high', 'Weapons have strict platform restrictions and legal requirements'),
('gun', 'high', 'Firearms are prohibited or heavily restricted on most platforms'),
('knife', 'warning', 'Knives may have platform restrictions depending on type'),
('blade', 'warning', 'Bladed items may have platform restrictions'),

-- Chemical and hazardous materials
('chemical', 'warning', 'Chemicals may require special shipping and platform compliance'),
('toxic', 'high', 'Toxic materials are prohibited or heavily restricted'),
('flammable', 'warning', 'Flammable items have shipping and platform restrictions'),
('explosive', 'high', 'Explosive materials are prohibited on all platforms');

-- Update existing rules to have more specific reasons where needed
UPDATE public.compliance_rules 
SET reason = 'Brand trademark violation - unauthorized use of trademarked brand names'
WHERE term IN ('branded', 'logo') AND reason LIKE '%Generic%';

-- Add some technology brand terms
INSERT INTO public.compliance_rules (term, risk_level, reason) VALUES
('microsoft', 'high', 'Microsoft is a protected trademark - use may result in copyright infringement'),
('google', 'high', 'Google is a protected trademark - use may result in copyright infringement'),
('facebook', 'high', 'Facebook/Meta is a protected trademark - use may result in copyright infringement'),
('sony', 'high', 'Sony is a protected trademark - use may result in copyright infringement'),
('canon', 'high', 'Canon is a protected trademark - use may result in copyright infringement'),
('nikon', 'high', 'Nikon is a protected trademark - use may result in copyright infringement');