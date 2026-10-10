import { Pressable, View } from 'react-native';
import { todayISO, weekStart } from '../engine/dates';
import { shoppingList } from '../engine/shopping';
import { useApp } from '../store/useApp';
import { Icon } from '../ui/Icon';
import { Banner, Card, Row, Screen, T } from '../ui/kit';
import { useTheme } from '../ui/theme';

export default function Shopping() {
  const { c } = useTheme();
  const plan = useApp((s) => s.data.plan);
  const checked = useApp((s) => s.data.shoppingChecked);
  const toggle = useApp((s) => s.toggleShopping);
  const today = todayISO();
  const thisWeek = checked.weekStart === weekStart(today) ? checked.items : {};
  const { items, edited } = shoppingList(plan);
  const done = items.filter((i) => thisWeek[i.id]).length;
  return (
    <Screen>
      <T muted>
        For the default week. Ticks reset every Sunday. {done}/{items.length} done.
      </T>
      {edited ? <Banner tone="info" text="Your plan was edited: eggs, yogurt, whey, bread, bananas, apples and sweet potatoes are recalculated. Other items show the default amount." /> : null}
      <Card style={{ gap: 0 }}>
        {items.map((it) => {
          const on = !!thisWeek[it.id];
          return (
            <Pressable
              key={it.id}
              onPress={() => toggle(it.id, today)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${it.name} ${it.display}`}
              style={{ minHeight: 52, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: c.border }}
            >
              <Row>
                <View style={{ width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: on ? c.emerald : c.border, backgroundColor: on ? c.emerald : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <Icon name="check" size={16} color="#fff" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <T v="bodyStrong" style={{ textDecorationLine: on ? 'line-through' : 'none' }}>{it.name}</T>
                  {it.display ? <T v="caption" muted>{it.display}</T> : null}
                </View>
              </Row>
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}
