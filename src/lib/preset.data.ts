/**
 * preset.data.ts
 * Full built-in preset data mirrored from the frontend static files.
 * Admin uses this to display and edit the actual meal plan foods,
 * shopping items, and exercise details.
 */

export type FoodItem = {
  name: string; name_am: string; calories: number; protein: number; carbs: number; fat: number
}

export type DaySlots = {
  breakfast: FoodItem[]; morningSnack: FoodItem[]; lunch: FoodItem[]
  afternoonSnack: FoodItem[]; dinner: FoodItem[]; beforeBed: FoodItem[]
}

export type MealPlanDays = Record<string, DaySlots>

export type ShoppingItem = { name: string; name_am: string }
export type ShoppingCategories = Record<string, ShoppingItem[]>

// ── Weight Gain Meal Plan ─────────────────────────────────────────────────────
export const WEIGHT_GAIN_DAYS: MealPlanDays = {
  Monday: {
    breakfast: [
      { name: 'Genfo (1 bowl)', name_am: 'ገንፎ (1 ጎድጓዳ)', calories: 320, protein: 10, carbs: 60, fat: 8 },
      { name: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ.)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Milk, whole (1 cup)', name_am: 'ወተት, ሙሉ ስብ (1 ኩባያ)', calories: 149, protein: 8, carbs: 12, fat: 8 },
    ],
    morningSnack: [
      { name: 'Banana (1 medium)', name_am: 'ሙዝ (1 መካከለኛ)', calories: 105, protein: 1, carbs: 27, fat: 0 },
      { name: 'Groundnuts / peanuts (1/4 cup)', name_am: 'ኦቾሎኒ (1/4 ኩባያ)', calories: 207, protein: 9, carbs: 6, fat: 18 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', name_am: 'እንጀራ (2 ቁ.)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Doro Wat (1 piece + sauce)', name_am: 'ዶሮ ወጥ (1 ቁ. + ወጥ)', calories: 310, protein: 28, carbs: 8, fat: 18 },
      { name: 'Misir Wat (1 cup)', name_am: 'ምስር ወጥ (1 ኩባያ)', calories: 230, protein: 16, carbs: 35, fat: 4 },
    ],
    afternoonSnack: [
      { name: 'Avocado juice (1 glass)', name_am: 'አቮካዶ ጁስ (1 ብርጭቆ)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    dinner: [
      { name: 'White rice (cooked, 1 cup)', name_am: 'ነጭ ሩዝ (1 ኩባያ)', calories: 242, protein: 4, carbs: 53, fat: 0 },
      { name: 'Tibs (150g)', name_am: 'ጥብስ (150 ግ.)', calories: 320, protein: 30, carbs: 4, fat: 20 },
      { name: 'Gomen (cooked, 1 cup)', name_am: 'ጎመን (1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
    ],
    beforeBed: [
      { name: 'Ergo (1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Honey (1 tbsp)', name_am: 'ማር (1 ማንኪያ)', calories: 64, protein: 0, carbs: 17, fat: 0 },
    ],
  },
  Tuesday: {
    breakfast: [
      { name: 'Ambasha (1 slice)', name_am: 'አምባሻ (1 ቁራጭ)', calories: 210, protein: 6, carbs: 40, fat: 3 },
      { name: 'Egg (1 large)', name_am: 'እንቁላል (1 ቁ.)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Ayib (50g)', name_am: 'አይብ (50 ግ.)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Avocado juice (1 glass)', name_am: 'አቮካዶ ጁስ (1 ብርጭቆ)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    morningSnack: [
      { name: 'Mango (1 cup)', name_am: 'ማንጎ (1 ኩባያ)', calories: 99, protein: 1, carbs: 25, fat: 1 },
      { name: 'Peanut butter (2 tbsp)', name_am: 'የኦቾሎኒ ቅቤ (2 ማንኪያ)', calories: 190, protein: 8, carbs: 7, fat: 16 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', name_am: 'እንጀራ (2 ቁ.)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Shiro Wat (1 cup)', name_am: 'ሽሮ ወጥ (1 ኩባያ)', calories: 210, protein: 12, carbs: 28, fat: 6 },
      { name: 'Tibs (150g)', name_am: 'ጥብስ (150 ግ.)', calories: 320, protein: 30, carbs: 4, fat: 20 },
    ],
    afternoonSnack: [
      { name: 'Chechebsa (1 serving)', name_am: 'ጨጨብሳ (1 ድርሻ)', calories: 380, protein: 8, carbs: 48, fat: 18 },
    ],
    dinner: [
      { name: 'Pasta (cooked, 1 cup)', name_am: 'ፓስታ (1 ኩባያ)', calories: 220, protein: 8, carbs: 43, fat: 1 },
      { name: 'Chicken breast (grilled, 100g)', name_am: 'የዶሮ ደረት (100 ግ.)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Tikel Gomen (1 cup)', name_am: 'ጥቅል ጎመን (1 ኩባያ)', calories: 80, protein: 2, carbs: 16, fat: 1 },
    ],
    beforeBed: [
      { name: 'Milk, whole (1 cup)', name_am: 'ወተት (1 ኩባያ)', calories: 149, protein: 8, carbs: 12, fat: 8 },
      { name: 'Peanut butter (2 tbsp)', name_am: 'የኦቾሎኒ ቅቤ (2 ማንኪያ)', calories: 190, protein: 8, carbs: 7, fat: 16 },
    ],
  },
  Wednesday: {
    breakfast: [
      { name: 'Teff flour (1 cup)', name_am: 'የጤፍ ዱቄት (1 ኩባያ)', calories: 450, protein: 16, carbs: 88, fat: 5 },
      { name: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ.)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Butter / Niter kibbeh (1 tbsp)', name_am: 'ቅቤ / ንጥር ቅቤ (1 ማንኪያ)', calories: 102, protein: 0, carbs: 0, fat: 12 },
    ],
    morningSnack: [
      { name: 'Banana (1 medium)', name_am: 'ሙዝ (1 መካከለኛ)', calories: 105, protein: 1, carbs: 27, fat: 0 },
      { name: 'Groundnuts / peanuts (1/4 cup)', name_am: 'ኦቾሎኒ (1/4 ኩባያ)', calories: 207, protein: 9, carbs: 6, fat: 18 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', name_am: 'እንጀራ (2 ቁ.)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Kitfo (100g)', name_am: 'ክትፎ (100 ግ.)', calories: 250, protein: 22, carbs: 0, fat: 18 },
      { name: 'Ayib (50g)', name_am: 'አይብ (50 ግ.)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Gomen (cooked, 1 cup)', name_am: 'ጎመን (1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
    ],
    afternoonSnack: [
      { name: 'Avocado juice (1 glass)', name_am: 'አቮካዶ ጁስ (1 ብርጭቆ)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    dinner: [
      { name: 'White rice (cooked, 1 cup)', name_am: 'ነጭ ሩዝ (1 ኩባያ)', calories: 242, protein: 4, carbs: 53, fat: 0 },
      { name: 'Beef (lean, grilled, 100g)', name_am: 'የበሬ ሥጋ (100 ግ.)', calories: 215, protein: 26, carbs: 0, fat: 12 },
      { name: 'Chickpeas (cooked, 1 cup)', name_am: 'ሽምብራ (1 ኩባያ)', calories: 269, protein: 15, carbs: 45, fat: 4 },
    ],
    beforeBed: [
      { name: 'Ergo (1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Banana (1 medium)', name_am: 'ሙዝ (1 መካከለኛ)', calories: 105, protein: 1, carbs: 27, fat: 0 },
    ],
  },
  Thursday: {
    breakfast: [
      { name: 'Genfo (1 bowl)', name_am: 'ገንፎ (1 ጎድጓዳ)', calories: 320, protein: 10, carbs: 60, fat: 8 },
      { name: 'Egg (1 large)', name_am: 'እንቁላል (1 ቁ.)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Milk, whole (1 cup)', name_am: 'ወተት (1 ኩባያ)', calories: 149, protein: 8, carbs: 12, fat: 8 },
    ],
    morningSnack: [
      { name: 'Sambusa (1 piece)', name_am: 'ሳምቡሳ (1 ቁ.)', calories: 200, protein: 7, carbs: 22, fat: 10 },
      { name: 'Mango (1 cup)', name_am: 'ማንጎ (1 ኩባያ)', calories: 99, protein: 1, carbs: 25, fat: 1 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', name_am: 'እንጀራ (2 ቁ.)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Ater Kik (1 cup)', name_am: 'አተር ክክ (1 ኩባያ)', calories: 220, protein: 14, carbs: 34, fat: 3 },
      { name: 'Chicken breast (grilled, 100g)', name_am: 'የዶሮ ደረት (100 ግ.)', calories: 165, protein: 31, carbs: 0, fat: 4 },
    ],
    afternoonSnack: [
      { name: 'Dabo kolo (1/4 cup)', name_am: 'ዳቦ ቆሎ (1/4 ኩባያ)', calories: 160, protein: 4, carbs: 28, fat: 4 },
      { name: 'Avocado (1/2)', name_am: 'አቮካዶ (1/2 ቁ.)', calories: 120, protein: 1, carbs: 6, fat: 11 },
    ],
    dinner: [
      { name: 'Macaroni (cooked, 1 cup)', name_am: 'ማካሮኒ (1 ኩባያ)', calories: 220, protein: 8, carbs: 43, fat: 1 },
      { name: 'Ground beef (100g)', name_am: 'የበሬ ስጋ (100 ግ.)', calories: 254, protein: 26, carbs: 0, fat: 16 },
      { name: 'Fosolia (cooked, 1 cup)', name_am: 'ፎሶሊያ (1 ኩባያ)', calories: 44, protein: 2, carbs: 10, fat: 0 },
    ],
    beforeBed: [
      { name: 'Ergo (1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Honey (1 tbsp)', name_am: 'ማር (1 ማንኪያ)', calories: 64, protein: 0, carbs: 17, fat: 0 },
    ],
  },
  Friday: {
    breakfast: [
      { name: 'Firfir (1 cup)', name_am: 'ፍርፍር (1 ኩባያ)', calories: 260, protein: 8, carbs: 42, fat: 7 },
      { name: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ.)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Milk, whole (1 cup)', name_am: 'ወተት (1 ኩባያ)', calories: 149, protein: 8, carbs: 12, fat: 8 },
    ],
    morningSnack: [
      { name: 'Banana (1 medium)', name_am: 'ሙዝ (1 መካከለኛ)', calories: 105, protein: 1, carbs: 27, fat: 0 },
      { name: 'Peanut butter (2 tbsp)', name_am: 'የኦቾሎኒ ቅቤ (2 ማንኪያ)', calories: 190, protein: 8, carbs: 7, fat: 16 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', name_am: 'እንጀራ (2 ቁ.)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Asa (grilled, 100g)', name_am: 'ዓሣ (100 ግ.)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Misir Wat (1 cup)', name_am: 'ምስር ወጥ (1 ኩባያ)', calories: 230, protein: 16, carbs: 35, fat: 4 },
    ],
    afternoonSnack: [
      { name: 'Avocado juice (1 glass)', name_am: 'አቮካዶ ጁስ (1 ብርጭቆ)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    dinner: [
      { name: 'White rice (cooked, 1 cup)', name_am: 'ነጭ ሩዝ (1 ኩባያ)', calories: 242, protein: 4, carbs: 53, fat: 0 },
      { name: 'Doro Wat (1 piece + sauce)', name_am: 'ዶሮ ወጥ (1 ቁ. + ወጥ)', calories: 310, protein: 28, carbs: 8, fat: 18 },
      { name: 'Tikel Gomen (1 cup)', name_am: 'ጥቅል ጎመን (1 ኩባያ)', calories: 80, protein: 2, carbs: 16, fat: 1 },
    ],
    beforeBed: [
      { name: 'Milk, whole (1 cup)', name_am: 'ወተት (1 ኩባያ)', calories: 149, protein: 8, carbs: 12, fat: 8 },
      { name: 'Groundnuts (1/4 cup)', name_am: 'ኦቾሎኒ (1/4 ኩባያ)', calories: 207, protein: 9, carbs: 6, fat: 18 },
    ],
  },
  Saturday: {
    breakfast: [
      { name: 'Ambasha (1 slice)', name_am: 'አምባሻ (1 ቁራጭ)', calories: 210, protein: 6, carbs: 40, fat: 3 },
      { name: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ.)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Ayib (50g)', name_am: 'አይብ (50 ግ.)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Fresh juice (1 glass)', name_am: 'ትኩስ ጁስ (1 ብርጭቆ)', calories: 130, protein: 1, carbs: 30, fat: 1 },
    ],
    morningSnack: [
      { name: 'Guava (1 cup)', name_am: 'ዘይቱን (1 ኩባያ)', calories: 112, protein: 4, carbs: 24, fat: 2 },
      { name: 'Groundnuts (1/4 cup)', name_am: 'ኦቾሎኒ (1/4 ኩባያ)', calories: 207, protein: 9, carbs: 6, fat: 18 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', name_am: 'እንጀራ (2 ቁ.)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Lamb (cooked, 100g)', name_am: 'የበግ ሥጋ (100 ግ.)', calories: 258, protein: 25, carbs: 0, fat: 17 },
      { name: 'Shiro Wat (1 cup)', name_am: 'ሽሮ ወጥ (1 ኩባያ)', calories: 210, protein: 12, carbs: 28, fat: 6 },
    ],
    afternoonSnack: [
      { name: 'Chechebsa (1 serving)', name_am: 'ጨጨብሳ (1 ድርሻ)', calories: 380, protein: 8, carbs: 48, fat: 18 },
    ],
    dinner: [
      { name: 'Pasta (cooked, 1 cup)', name_am: 'ፓስታ (1 ኩባያ)', calories: 220, protein: 8, carbs: 43, fat: 1 },
      { name: 'Beef (lean, grilled, 100g)', name_am: 'የበሬ ሥጋ (100 ግ.)', calories: 215, protein: 26, carbs: 0, fat: 12 },
      { name: 'Spinach (cooked, 1 cup)', name_am: 'ስፒናች (1 ኩባያ)', calories: 41, protein: 5, carbs: 7, fat: 0 },
      { name: 'Butter / Niter kibbeh (1 tbsp)', name_am: 'ቅቤ (1 ማንኪያ)', calories: 102, protein: 0, carbs: 0, fat: 12 },
    ],
    beforeBed: [
      { name: 'Ergo (1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Banana (1 medium)', name_am: 'ሙዝ (1 መካከለኛ)', calories: 105, protein: 1, carbs: 27, fat: 0 },
    ],
  },
  Sunday: {
    breakfast: [
      { name: 'Genfo (1 bowl)', name_am: 'ገንፎ (1 ጎድጓዳ)', calories: 320, protein: 10, carbs: 60, fat: 8 },
      { name: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ.)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Milk, whole (1 cup)', name_am: 'ወተት (1 ኩባያ)', calories: 149, protein: 8, carbs: 12, fat: 8 },
    ],
    morningSnack: [
      { name: 'Papaya (1 cup)', name_am: 'ፓፓያ (1 ኩባያ)', calories: 62, protein: 1, carbs: 16, fat: 0 },
      { name: 'Peanut butter (2 tbsp)', name_am: 'የኦቾሎኒ ቅቤ (2 ማንኪያ)', calories: 190, protein: 8, carbs: 7, fat: 16 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', name_am: 'እንጀራ (2 ቁ.)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Kitfo (100g)', name_am: 'ክትፎ (100 ግ.)', calories: 250, protein: 22, carbs: 0, fat: 18 },
      { name: 'Ayib (50g)', name_am: 'አይብ (50 ግ.)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Gomen (cooked, 1 cup)', name_am: 'ጎመን (1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
    ],
    afternoonSnack: [
      { name: 'Avocado juice (1 glass)', name_am: 'አቮካዶ ጁስ (1 ብርጭቆ)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    dinner: [
      { name: 'White rice (cooked, 1 cup)', name_am: 'ነጭ ሩዝ (1 ኩባያ)', calories: 242, protein: 4, carbs: 53, fat: 0 },
      { name: 'Tibs (150g)', name_am: 'ጥብስ (150 ግ.)', calories: 320, protein: 30, carbs: 4, fat: 20 },
      { name: 'Misir Wat (1 cup)', name_am: 'ምስር ወጥ (1 ኩባያ)', calories: 230, protein: 16, carbs: 35, fat: 4 },
    ],
    beforeBed: [
      { name: 'Ergo (1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Honey (1 tbsp)', name_am: 'ማር (1 ማንኪያ)', calories: 64, protein: 0, carbs: 17, fat: 0 },
    ],
  },
}

// ── Weight Loss Meal Plan ─────────────────────────────────────────────────────
export const WEIGHT_LOSS_DAYS: MealPlanDays = {
  Monday: {
    breakfast: [
      { name: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ.)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Gomen (cooked, 1 cup)', name_am: 'ጎመን (1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
      { name: 'Tomato (1 medium)', name_am: 'ቲማቲም (1 ቁ.)', calories: 22, protein: 1, carbs: 5, fat: 0 },
    ],
    morningSnack: [{ name: 'Apple (1 medium)', name_am: 'ፖም (1 ቁ.)', calories: 95, protein: 0, carbs: 25, fat: 0 }],
    lunch: [
      { name: 'Injera (1 piece)', name_am: 'እንጀራ (1 ቁ.)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Chicken breast (grilled, 100g)', name_am: 'የዶሮ ደረት (100 ግ.)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Misir Wat (1 cup)', name_am: 'ምስር ወጥ (1 ኩባያ)', calories: 230, protein: 16, carbs: 35, fat: 4 },
      { name: 'Spinach (cooked, 1 cup)', name_am: 'ስፒናች (1 ኩባያ)', calories: 41, protein: 5, carbs: 7, fat: 0 },
    ],
    afternoonSnack: [{ name: 'Ergo (1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 145, protein: 9, carbs: 11, fat: 8 }],
    dinner: [
      { name: 'Asa (grilled, 100g)', name_am: 'ዓሣ (100 ግ.)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Tikel Gomen (1 cup)', name_am: 'ጥቅል ጎመን (1 ኩባያ)', calories: 80, protein: 2, carbs: 16, fat: 1 },
      { name: 'Beetroot (cooked, 1 cup)', name_am: 'ቀይ ሥር (1 ኩባያ)', calories: 75, protein: 3, carbs: 17, fat: 0 },
    ],
    beforeBed: [{ name: 'Water (1 glass)', name_am: 'ውሃ (1 ብርጭቆ)', calories: 0, protein: 0, carbs: 0, fat: 0 }],
  },
  Tuesday: {
    breakfast: [
      { name: 'Egg (1 large)', name_am: 'እንቁላል (1 ቁ.)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Ayib (50g)', name_am: 'አይብ (50 ግ.)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Tomato (1 medium)', name_am: 'ቲማቲም (1 ቁ.)', calories: 22, protein: 1, carbs: 5, fat: 0 },
      { name: 'Carrot (1 medium)', name_am: 'ካሮት (1 ቁ.)', calories: 25, protein: 1, carbs: 6, fat: 0 },
    ],
    morningSnack: [{ name: 'Orange (1 medium)', name_am: 'ብርቱካን (1 ቁ.)', calories: 62, protein: 1, carbs: 15, fat: 0 }],
    lunch: [
      { name: 'Injera (1 piece)', name_am: 'እንጀራ (1 ቁ.)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Shiro Wat (1 cup)', name_am: 'ሽሮ ወጥ (1 ኩባያ)', calories: 210, protein: 12, carbs: 28, fat: 6 },
      { name: 'Fosolia (cooked, 1 cup)', name_am: 'ፎሶሊያ (1 ኩባያ)', calories: 44, protein: 2, carbs: 10, fat: 0 },
    ],
    afternoonSnack: [{ name: 'Watermelon (1 cup)', name_am: 'ሐብሐብ (1 ኩባያ)', calories: 46, protein: 1, carbs: 11, fat: 0 }],
    dinner: [
      { name: 'Goat (cooked, 100g)', name_am: 'የፍየል ሥጋ (100 ግ.)', calories: 143, protein: 27, carbs: 0, fat: 3 },
      { name: 'Gomen (cooked, 1 cup)', name_am: 'ጎመን (1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
      { name: 'Potato (boiled, 1 medium)', name_am: 'ድንች (1 ቁ.)', calories: 130, protein: 3, carbs: 30, fat: 0 },
    ],
    beforeBed: [{ name: 'Milk, low-fat (1 cup)', name_am: 'ወተት, ቀጭን (1 ኩባያ)', calories: 102, protein: 8, carbs: 12, fat: 2 }],
  },
  Wednesday: {
    breakfast: [
      { name: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ.)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Spinach (cooked, 1 cup)', name_am: 'ስፒናች (1 ኩባያ)', calories: 41, protein: 5, carbs: 7, fat: 0 },
      { name: 'Tomato (1 medium)', name_am: 'ቲማቲም (1 ቁ.)', calories: 22, protein: 1, carbs: 5, fat: 0 },
    ],
    morningSnack: [{ name: 'Apple (1 medium)', name_am: 'ፖም (1 ቁ.)', calories: 95, protein: 0, carbs: 25, fat: 0 }],
    lunch: [
      { name: 'Injera (1 piece)', name_am: 'እንጀራ (1 ቁ.)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Asa (grilled, 100g)', name_am: 'ዓሣ (100 ግ.)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Ater Kik (1 cup)', name_am: 'አተር ክክ (1 ኩባያ)', calories: 220, protein: 14, carbs: 34, fat: 3 },
    ],
    afternoonSnack: [{ name: 'Yogurt, plain (1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 149, protein: 9, carbs: 11, fat: 8 }],
    dinner: [
      { name: 'Chicken breast (grilled, 100g)', name_am: 'የዶሮ ደረት (100 ግ.)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Beetroot (cooked, 1 cup)', name_am: 'ቀይ ሥር (1 ኩባያ)', calories: 75, protein: 3, carbs: 17, fat: 0 },
      { name: 'Tikel Gomen (1 cup)', name_am: 'ጥቅል ጎመን (1 ኩባያ)', calories: 80, protein: 2, carbs: 16, fat: 1 },
    ],
    beforeBed: [{ name: 'Water (1 glass)', name_am: 'ውሃ (1 ብርጭቆ)', calories: 0, protein: 0, carbs: 0, fat: 0 }],
  },
  Thursday: {
    breakfast: [
      { name: 'Fava beans / ful (1 cup)', name_am: 'ፉል (1 ኩባያ)', calories: 187, protein: 13, carbs: 33, fat: 1 },
      { name: 'Tomato (1 medium)', name_am: 'ቲማቲም (1 ቁ.)', calories: 22, protein: 1, carbs: 5, fat: 0 },
      { name: 'Onion (1 medium)', name_am: 'ቀይ ሽንኩርት (1 ቁ.)', calories: 44, protein: 1, carbs: 10, fat: 0 },
    ],
    morningSnack: [{ name: 'Papaya (1 cup)', name_am: 'ፓፓያ (1 ኩባያ)', calories: 62, protein: 1, carbs: 16, fat: 0 }],
    lunch: [
      { name: 'Injera (1 piece)', name_am: 'እንጀራ (1 ቁ.)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Doro Wat (1 piece + sauce)', name_am: 'ዶሮ ወጥ (1 ቁ. + ወጥ)', calories: 310, protein: 28, carbs: 8, fat: 18 },
      { name: 'Gomen (cooked, 1 cup)', name_am: 'ጎመን (1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
    ],
    afternoonSnack: [
      { name: 'Tuna (canned, 100g)', name_am: 'ቱና (100 ግ.)', calories: 116, protein: 26, carbs: 0, fat: 1 },
      { name: 'Carrot (1 medium)', name_am: 'ካሮት (1 ቁ.)', calories: 25, protein: 1, carbs: 6, fat: 0 },
    ],
    dinner: [
      { name: 'Beef (lean, grilled, 100g)', name_am: 'የበሬ ሥጋ (100 ግ.)', calories: 215, protein: 26, carbs: 0, fat: 12 },
      { name: 'Sweet potato (boiled)', name_am: 'ስኳር ድንች (1 ቁ.)', calories: 130, protein: 2, carbs: 30, fat: 0 },
      { name: 'Spinach (cooked, 1 cup)', name_am: 'ስፒናች (1 ኩባያ)', calories: 41, protein: 5, carbs: 7, fat: 0 },
    ],
    beforeBed: [{ name: 'Milk, low-fat (1 cup)', name_am: 'ወተት, ቀጭን (1 ኩባያ)', calories: 102, protein: 8, carbs: 12, fat: 2 }],
  },
  Friday: {
    breakfast: [
      { name: 'Egg (1 large)', name_am: 'እንቁላል (1 ቁ.)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Messer (green lentils, 1 cup)', name_am: 'ምሥር, አረንጓዴ (1 ኩባያ)', calories: 230, protein: 18, carbs: 40, fat: 1 },
    ],
    morningSnack: [{ name: 'Orange (1 medium)', name_am: 'ብርቱካን (1 ቁ.)', calories: 62, protein: 1, carbs: 15, fat: 0 }],
    lunch: [
      { name: 'Injera (1 piece)', name_am: 'እንጀራ (1 ቁ.)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Asa (grilled, 100g)', name_am: 'ዓሣ (100 ግ.)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Fosolia (cooked, 1 cup)', name_am: 'ፎሶሊያ (1 ኩባያ)', calories: 44, protein: 2, carbs: 10, fat: 0 },
    ],
    afternoonSnack: [{ name: 'Watermelon (1 cup)', name_am: 'ሐብሐብ (1 ኩባያ)', calories: 46, protein: 1, carbs: 11, fat: 0 }],
    dinner: [
      { name: 'Chicken breast (grilled, 100g)', name_am: 'የዶሮ ደረት (100 ግ.)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Tikel Gomen (1 cup)', name_am: 'ጥቅል ጎመን (1 ኩባያ)', calories: 80, protein: 2, carbs: 16, fat: 1 },
      { name: 'Beetroot (cooked, 1 cup)', name_am: 'ቀይ ሥር (1 ኩባያ)', calories: 75, protein: 3, carbs: 17, fat: 0 },
    ],
    beforeBed: [{ name: 'Ergo (1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 145, protein: 9, carbs: 11, fat: 8 }],
  },
  Saturday: {
    breakfast: [
      { name: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ.)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Gomen (cooked, 1 cup)', name_am: 'ጎመን (1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
      { name: 'Tomato (1 medium)', name_am: 'ቲማቲም (1 ቁ.)', calories: 22, protein: 1, carbs: 5, fat: 0 },
    ],
    morningSnack: [{ name: 'Guava (1 cup)', name_am: 'ዘይቱን (1 ኩባያ)', calories: 112, protein: 4, carbs: 24, fat: 2 }],
    lunch: [
      { name: 'Injera (1 piece)', name_am: 'እንጀራ (1 ቁ.)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Goat (cooked, 100g)', name_am: 'የፍየል ሥጋ (100 ግ.)', calories: 143, protein: 27, carbs: 0, fat: 3 },
      { name: 'Shiro Wat (1 cup)', name_am: 'ሽሮ ወጥ (1 ኩባያ)', calories: 210, protein: 12, carbs: 28, fat: 6 },
    ],
    afternoonSnack: [{ name: 'Yogurt, plain (1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 149, protein: 9, carbs: 11, fat: 8 }],
    dinner: [
      { name: 'Tuna (canned, 100g)', name_am: 'ቱና (100 ግ.)', calories: 116, protein: 26, carbs: 0, fat: 1 },
      { name: 'Sweet potato (boiled)', name_am: 'ስኳር ድንች (1 ቁ.)', calories: 130, protein: 2, carbs: 30, fat: 0 },
      { name: 'Spinach (cooked, 1 cup)', name_am: 'ስፒናች (1 ኩባያ)', calories: 41, protein: 5, carbs: 7, fat: 0 },
    ],
    beforeBed: [{ name: 'Water (1 glass)', name_am: 'ውሃ (1 ብርጭቆ)', calories: 0, protein: 0, carbs: 0, fat: 0 }],
  },
  Sunday: {
    breakfast: [
      { name: 'Fava beans / ful (1 cup)', name_am: 'ፉል (1 ኩባያ)', calories: 187, protein: 13, carbs: 33, fat: 1 },
      { name: 'Egg (1 large)', name_am: 'እንቁላል (1 ቁ.)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Tomato (1 medium)', name_am: 'ቲማቲም (1 ቁ.)', calories: 22, protein: 1, carbs: 5, fat: 0 },
    ],
    morningSnack: [{ name: 'Apple (1 medium)', name_am: 'ፖም (1 ቁ.)', calories: 95, protein: 0, carbs: 25, fat: 0 }],
    lunch: [
      { name: 'Injera (1 piece)', name_am: 'እንጀራ (1 ቁ.)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Chicken breast (grilled, 100g)', name_am: 'የዶሮ ደረት (100 ግ.)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Ater Kik (1 cup)', name_am: 'አተር ክክ (1 ኩባያ)', calories: 220, protein: 14, carbs: 34, fat: 3 },
    ],
    afternoonSnack: [{ name: 'Watermelon (1 cup)', name_am: 'ሐብሐብ (1 ኩባያ)', calories: 46, protein: 1, carbs: 11, fat: 0 }],
    dinner: [
      { name: 'Asa (grilled, 100g)', name_am: 'ዓሣ (100 ግ.)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Gomen (cooked, 1 cup)', name_am: 'ጎመን (1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
      { name: 'Beetroot (cooked, 1 cup)', name_am: 'ቀይ ሥር (1 ኩባያ)', calories: 75, protein: 3, carbs: 17, fat: 0 },
    ],
    beforeBed: [{ name: 'Milk, low-fat (1 cup)', name_am: 'ወተት, ቀጭን (1 ኩባያ)', calories: 102, protein: 8, carbs: 12, fat: 2 }],
  },
}

// ── Shopping Lists ─────────────────────────────────────────────────────────────
export const WEIGHT_GAIN_SHOPPING: ShoppingCategories = {
  'Protein Sources': [
    { name: 'Eggs (×12)', name_am: 'እንቁላል (×12)' },
    { name: 'Chicken breast (500g)', name_am: 'የዶሮ ደረት (500 ግ.)' },
    { name: 'Beef / Tibs (500g)', name_am: 'የበሬ ሥጋ / ጥብስ (500 ግ.)' },
    { name: 'Kitfo (lean minced beef, 300g)', name_am: 'ክትፎ (300 ግ.)' },
    { name: 'Lamb (300g)', name_am: 'የበግ ሥጋ (300 ግ.)' },
    { name: 'Asa / Nile tilapia (300g)', name_am: 'ዓሣ (300 ግ.)' },
    { name: 'Ayib (Ethiopian cheese, 200g)', name_am: 'አይብ (200 ግ.)' },
    { name: 'Ergo (Ethiopian yogurt, 1L)', name_am: 'እርጎ (1 ሊ.)' },
    { name: 'Milk, whole (2L)', name_am: 'ወተት, ሙሉ ስብ (2 ሊ.)' },
    { name: 'Groundnuts / peanuts (250g)', name_am: 'ኦቾሎኒ (250 ግ.)' },
    { name: 'Peanut butter (1 jar)', name_am: 'የኦቾሎኒ ቅቤ (1 ጠርሙስ)' },
  ],
  'Carb Sources': [
    { name: 'Injera (1 pack / 14 pieces)', name_am: 'እንጀራ (1 ፓኬት / 14 ቁ.)' },
    { name: 'Teff flour (1 kg)', name_am: 'የጤፍ ዱቄት (1 ኪ.ግ.)' },
    { name: 'White rice (1 kg)', name_am: 'ነጭ ሩዝ (1 ኪ.ግ.)' },
    { name: 'Pasta / Macaroni (500g)', name_am: 'ፓስታ / ማካሮኒ (500 ግ.)' },
    { name: 'Genfo flour (sorghum, 500g)', name_am: 'የገንፎ ዱቄት (500 ግ.)' },
    { name: 'Ambasha bread (×2 loaves)', name_am: 'አምባሻ (×2 ዳቦ)' },
    { name: 'Misir (red lentils, 500g)', name_am: 'ምስር (500 ግ.)' },
    { name: 'Shiro powder (500g)', name_am: 'ሽሮ ዱቄት (500 ግ.)' },
    { name: 'Ater kik (yellow split peas, 500g)', name_am: 'አተር ክክ (500 ግ.)' },
    { name: 'Chickpeas (500g)', name_am: 'ሽምብራ (500 ግ.)' },
  ],
  'Healthy Fats': [
    { name: 'Avocado (×4)', name_am: 'አቮካዶ (×4)' },
    { name: 'Niter kibbeh / butter (200g)', name_am: 'ንጥር ቅቤ / ቅቤ (200 ግ.)' },
    { name: 'Cooking oil (500ml)', name_am: 'የምግብ ዘይት (500 ሚ.ሊ.)' },
  ],
  'Fruits & Vegetables': [
    { name: 'Bananas (×6)', name_am: 'ሙዝ (×6)' },
    { name: 'Mango (×2)', name_am: 'ማንጎ (×2)' },
    { name: 'Papaya (×1)', name_am: 'ፓፓያ (×1)' },
    { name: 'Guava (×4)', name_am: 'ዘይቱን (×4)' },
    { name: 'Gomen (collard greens, 1 bunch)', name_am: 'ጎመን (1 ዕምቅ)' },
    { name: 'Tikel gomen (cabbage, ×1 head)', name_am: 'ጥቅል ጎመን (×1)' },
    { name: 'Spinach (1 bunch)', name_am: 'ስፒናች (1 ዕምቅ)' },
    { name: 'Tomatoes (×4)', name_am: 'ቲማቲም (×4)' },
    { name: 'Onions (×3)', name_am: 'ቀይ ሽንኩርት (×3)' },
    { name: 'Fosolia (green beans, 300g)', name_am: 'ፎሶሊያ (300 ግ.)' },
  ],
  'Other': [
    { name: 'Honey (1 jar)', name_am: 'ማር (1 ጠርሙስ)' },
    { name: 'Berbere spice (100g)', name_am: 'በርበሬ (100 ግ.)' },
    { name: 'Chili / mitmita (50g)', name_am: 'ሚጥሚጣ (50 ግ.)' },
    { name: 'Dabo kolo (1 pack)', name_am: 'ዳቦ ቆሎ (1 ፓኬት)' },
    { name: 'Fresh juice (×2 bottles)', name_am: 'ትኩስ ጁስ (×2 ጠርሙስ)' },
  ],
}

export const WEIGHT_LOSS_SHOPPING: ShoppingCategories = {
  'Protein Sources': [
    { name: 'Eggs (×8)', name_am: 'እንቁላል (×8)' },
    { name: 'Chicken breast (500g)', name_am: 'የዶሮ ደረት (500 ግ.)' },
    { name: 'Asa / Nile tilapia (400g)', name_am: 'ዓሣ (400 ግ.)' },
    { name: 'Beef, lean (300g)', name_am: 'የበሬ ሥጋ, ቀጭን (300 ግ.)' },
    { name: 'Goat meat (300g)', name_am: 'የፍየል ሥጋ (300 ግ.)' },
    { name: 'Tuna, canned in water (×3 cans)', name_am: 'ቱና, በውሃ (×3 ቆርቆሮ)' },
    { name: 'Ayib (Ethiopian cheese, 150g)', name_am: 'አይብ (150 ግ.)' },
    { name: 'Ergo / plain yogurt (500ml)', name_am: 'እርጎ (500 ሚ.ሊ.)' },
    { name: 'Milk, low-fat (1L)', name_am: 'ወተት, ቀጭን (1 ሊ.)' },
    { name: 'Fava beans / ful (500g)', name_am: 'ፉል / ባቄላ (500 ግ.)' },
  ],
  'Carb Sources': [
    { name: 'Injera (1 pack / 7 pieces)', name_am: 'እንጀራ (1 ፓኬት / 7 ቁ.)' },
    { name: 'Misir (red lentils, 500g)', name_am: 'ምስር (500 ግ.)' },
    { name: 'Ater kik (yellow split peas, 500g)', name_am: 'አተር ክክ (500 ግ.)' },
    { name: 'Messer (green lentils, 500g)', name_am: 'ምሥር, አረንጓዴ (500 ግ.)' },
    { name: 'Shiro powder (250g)', name_am: 'ሽሮ ዱቄት (250 ግ.)' },
    { name: 'Sweet potato (×3)', name_am: 'ስኳር ድንች (×3)' },
    { name: 'Potato (×3)', name_am: 'ድንች (×3)' },
  ],
  'Healthy Fats': [
    { name: 'Cooking oil, light (250ml)', name_am: 'የምግብ ዘይት, ቀላል (250 ሚ.ሊ.)' },
  ],
  'Fruits & Vegetables': [
    { name: 'Apples (×4)', name_am: 'ፖም (×4)' },
    { name: 'Oranges (×4)', name_am: 'ብርቱካን (×4)' },
    { name: 'Watermelon (×1 small)', name_am: 'ሐብሐብ (×1 ትንሽ)' },
    { name: 'Papaya (×1)', name_am: 'ፓፓያ (×1)' },
    { name: 'Guava (×3)', name_am: 'ዘይቱን (×3)' },
    { name: 'Spinach (2 bunches)', name_am: 'ስፒናች (2 ዕምቅ)' },
    { name: 'Gomen (collard greens, 1 bunch)', name_am: 'ጎመን (1 ዕምቅ)' },
    { name: 'Tikel gomen (cabbage, ×1 head)', name_am: 'ጥቅል ጎመን (×1)' },
    { name: 'Tomatoes (×5)', name_am: 'ቲማቲም (×5)' },
    { name: 'Carrots (×4)', name_am: 'ካሮት (×4)' },
    { name: 'Onions (×3)', name_am: 'ቀይ ሽንኩርት (×3)' },
    { name: 'Beetroot (×3)', name_am: 'ቀይ ሥር (×3)' },
    { name: 'Fosolia (green beans, 300g)', name_am: 'ፎሶሊያ (300 ግ.)' },
  ],
  'Other': [
    { name: 'Berbere spice (50g)', name_am: 'በርበሬ (50 ግ.)' },
    { name: 'Water (2L bottles ×4)', name_am: 'ውሃ (2 ሊ. ×4 ጠርሙስ)' },
  ],
}

// ── Lookups ────────────────────────────────────────────────────────────────────
export const PRESET_MEAL_PLAN_DATA: Record<string, MealPlanDays> = {
  'weight-gain': WEIGHT_GAIN_DAYS,
  'weight-loss': WEIGHT_LOSS_DAYS,
}

export const PRESET_SHOPPING_DATA: Record<string, ShoppingCategories> = {
  'weight-gain': WEIGHT_GAIN_SHOPPING,
  'weight-loss': WEIGHT_LOSS_SHOPPING,
}

export const SLOT_LABELS: Record<string, string> = {
  breakfast: 'Breakfast', morningSnack: 'Morning Snack', lunch: 'Lunch',
  afternoonSnack: 'Afternoon Snack', dinner: 'Dinner', beforeBed: 'Before Bed',
}

export const DAYS_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
