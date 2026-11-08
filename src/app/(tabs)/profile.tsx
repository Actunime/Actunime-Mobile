import { MyMemberScreen } from '@/components/member/my-member-screen';

/**
 * Mon profil : mon profil public (celui que voient les autres), avec de quoi le modifier. Il n'y a plus de page
 * « Profil » à part : les réglages du compte (mise à jour de l'app, déconnexion) sont dans Paramètres.
 */
export default function ProfileScreen() {
  return <MyMemberScreen tab="profil" />;
}
