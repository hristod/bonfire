import { Modal, Pressable, Image, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon } from '@/components/ui/button';
import { X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export function ImageViewerModal({ visible, imageUrl, onClose }: ImageViewerModalProps) {
  if (!imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <Box className="flex-1 bg-black">
          {/* Close button */}
          <Box className="absolute top-4 right-4 z-10">
            <Button
              size="sm"
              className="bg-white/20 rounded-full"
              onPress={onClose}
            >
              <ButtonIcon as={X} className="text-white" />
            </Button>
          </Box>

          {/* Full-screen image */}
          <Pressable onPress={onClose} style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          </Pressable>
        </Box>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
