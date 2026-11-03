import sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import sovereign_infra

class SovereignInfraTests(unittest.TestCase):
    def test_path_filter_rejects_secrets_and_traversal(self):
        self.assertFalse(sovereign_infra.safe_name('../evil.txt'))
        self.assertFalse(sovereign_infra.safe_name('.env'))
        self.assertFalse(sovereign_infra.safe_name('infra/private-key.pem'))
        self.assertTrue(sovereign_infra.safe_name('training/registry/model_registry.json'))

    def test_backup_verify_and_restore_to_empty_temp_target(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);source=root/'source';source.mkdir();(source/'a.txt').write_text('alpha')
            archive=root/'backup.zip'
            import zipfile, hashlib, json
            with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
                data=b'alpha';z.writestr('training/a.txt',data)
                z.writestr('BACKUP_MANIFEST.json',json.dumps({'schemaVersion':'1.0.0','entries':[{'path':'training/a.txt','sha256':hashlib.sha256(data).hexdigest(),'size':5}]}))
            target=root/'restore'
            result=sovereign_infra.verify_backup(archive,target)
            self.assertEqual(result['status'],'RESTORE_VERIFIED')
            self.assertEqual((target/'training/a.txt').read_text(),'alpha')

    def test_restore_rejects_path_traversal(self):
        with tempfile.TemporaryDirectory() as tmp:
            import zipfile, hashlib, json
            archive=Path(tmp)/'bad.zip';data=b'bad'
            with zipfile.ZipFile(archive,'w') as z:
                z.writestr('../escape',data)
                z.writestr('BACKUP_MANIFEST.json',json.dumps({'entries':[{'path':'../escape','sha256':hashlib.sha256(data).hexdigest(),'size':3}]}))
            with self.assertRaisesRegex(ValueError,'UNSAFE_PATH'):
                sovereign_infra.verify_backup(archive)

if __name__=='__main__':unittest.main()
